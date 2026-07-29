import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { aiPracticeRequestSchema } from '@/lib/validations/ai-practice'
import { callTutor, OpenRouterError, streamTutor } from '@/lib/ai/openrouter'
import { getUserLanguageProfile } from '@/lib/language-profile.server'
import { buildTutorContext } from '@/lib/ai/tutor-context'
import { checkTutorBudget } from '@/lib/ai/tutor-budget'
import {
  appendAssistantMessage,
  appendTutorExchange,
  endActiveTutorSessions,
  loadOwnedTutorSession,
  MAX_SESSION_MESSAGES,
  startTutorSession,
} from '@/lib/ai/tutor-session.server'

const FORBIDDEN_CLIENT_FIELDS = [
  'model',
  'provider',
  'systemPrompt',
  'system_prompt',
  'modelRole',
  'language',
  'level',
  'nativeLanguages',
  'explanationLanguage',
  // History is now read from the stored session, never accepted from the client.
  'history',
]

/** Ends the caller's active session so the next start begins from scratch. */
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await endActiveTutorSessions(session.user.id)
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body === 'object' && body !== null) {
    for (const field of FORBIDDEN_CLIENT_FIELDS) {
      if (field in (body as Record<string, unknown>)) {
        return NextResponse.json({ error: `Field '${field}' is not allowed` }, { status: 400 })
      }
    }
  }

  const result = aiPracticeRequestSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid request', details: result.error.flatten() }, { status: 400 })
  }

  const parsed = result.data

  try {
    // Continuing a session: the stored transcript supplies both the language
    // settings and the history, so a caller cannot reshape either.
    let targetLanguageCode: string
    let mode: string
    let history: Parameters<typeof callTutor>[0]['history'] = []
    let sessionId: string | null = null

    if (parsed.action === 'message') {
      const loaded = await loadOwnedTutorSession(userId, parsed.sessionId)
      if (!loaded) {
        return NextResponse.json(
          { error: 'That practice session is no longer available. Start a new one.', code: 'SESSION_NOT_FOUND' },
          { status: 404 },
        )
      }
      if (loaded.atMessageLimit) {
        return NextResponse.json(
          {
            error: `This session has reached ${MAX_SESSION_MESSAGES} messages. Start a new session to keep practising.`,
            code: 'SESSION_LIMIT_REACHED',
            retryable: false,
          },
          { status: 409 },
        )
      }
      targetLanguageCode = loaded.view.targetLanguageCode
      mode = loaded.view.mode
      history = loaded.providerHistory
      sessionId = loaded.view.id
    } else {
      targetLanguageCode = parsed.targetLanguageCode
      mode = parsed.mode
    }

    const languageResult = await getUserLanguageProfile(userId)
    if (!languageResult?.complete) {
      return NextResponse.json(
        { error: 'Complete your language profile before starting a tutor session', code: 'LANGUAGE_PROFILE_REQUIRED' },
        { status: 409 },
      )
    }
    const tutorContext = buildTutorContext(languageResult.profile, targetLanguageCode)
    if (!tutorContext) {
      return NextResponse.json(
        { error: 'Target language is not in your language profile', code: 'INVALID_TARGET_LANGUAGE' },
        { status: 400 },
      )
    }

    // Metered only once the request is known to be valid, so malformed or
    // misdirected calls never consume a user's allowance or the shared budget.
    const budget = await checkTutorBudget(userId)
    if (!budget.allowed) {
      return NextResponse.json(
        { error: budget.message, code: budget.code, retryable: budget.retryable },
        { status: 429 },
      )
    }

    const generator = streamTutor({
      ...tutorContext,
      mode: mode as Parameters<typeof callTutor>[0]['mode'],
      history,
      userMessage: parsed.action === 'message' ? parsed.message : undefined,
    })

    /*
     * Pull the first chunk before committing to a 200. Everything that can go
     * wrong with reaching a model — no credits, rate limits, timeouts, a whole
     * exhausted chain — happens here, so those still arrive as ordinary HTTP
     * errors with a proper status instead of being buried inside a stream the
     * client has already started rendering.
     */
    const first = await generator.next()

    // Created only now, so a failed start never leaves an empty session behind.
    const activeSessionId =
      sessionId ?? (await startTutorSession({ userId, targetLanguageCode, mode })).id

    const encoder = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: Record<string, unknown>) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))

        let reply = first.done ? '' : (first.value ?? '')

        send({ type: 'session', sessionId: activeSessionId })
        if (reply) send({ type: 'delta', text: reply })

        try {
          if (!first.done) {
            for await (const delta of generator) {
              reply += delta
              send({ type: 'delta', text: delta })
            }
          }
          send({ type: 'done' })
        } catch (streamErr) {
          console.error(
            '[AI Practice] Stream interrupted:',
            streamErr instanceof Error ? streamErr.message : String(streamErr),
          )
          send({
            type: 'error',
            error: 'The reply was cut short. Please try again.',
            retryable: true,
          })
        } finally {
          // Persist whatever the learner actually saw. A partial reply is worth
          // keeping — it is already on their screen and in their context.
          if (reply.trim()) {
            try {
              if (parsed.action === 'message') {
                await appendTutorExchange({
                  sessionId: activeSessionId,
                  userId,
                  userMessage: parsed.message,
                  assistantReply: reply,
                })
              } else {
                await appendAssistantMessage({
                  sessionId: activeSessionId,
                  userId,
                  content: reply,
                })
              }
            } catch (persistErr) {
              console.error(
                '[AI Practice] Failed to persist exchange:',
                persistErr instanceof Error ? persistErr.message : String(persistErr),
              )
            }
          }
          controller.close()
        }
      },
    })

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store',
        // Streaming is pointless if a proxy buffers the whole response first.
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    if (err instanceof OpenRouterError) {
      switch (err.code) {
        case 'MISSING_CONFIG':
          return NextResponse.json(
            { error: 'AI service is not configured', code: err.code },
            { status: 503 },
          )
        case 'NO_CREDITS':
          return NextResponse.json(
            {
              error: 'The AI tutor is temporarily unavailable. Please try again shortly.',
              code: err.code,
            },
            { status: 503 },
          )
        case 'TIMEOUT':
          return NextResponse.json(
            { error: 'The AI tutor took too long to respond. Please try again.', code: err.code },
            { status: 504 },
          )
        case 'RATE_LIMIT':
          return NextResponse.json(
            { error: 'Too many requests. Please wait a moment and try again.', code: err.code },
            { status: 429 },
          )
        case 'MALFORMED_RESPONSE':
        case 'PROVIDER_ERROR':
          return NextResponse.json(
            { error: 'The AI provider encountered an error. Please try again.', code: err.code },
            { status: 502 },
          )
      }
    }
    console.error('[AI Practice] Unexpected error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
