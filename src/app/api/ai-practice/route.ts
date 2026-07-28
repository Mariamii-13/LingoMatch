import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { aiPracticeRequestSchema } from '@/lib/validations/ai-practice'
import { callTutor, OpenRouterError } from '@/lib/ai/openrouter'
import { getUserLanguageProfile } from '@/lib/language-profile.server'
import { buildTutorContext } from '@/lib/ai/tutor-context'

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
]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
    const languageResult = await getUserLanguageProfile(session.user.id)
    if (!languageResult?.complete) {
      return NextResponse.json(
        { error: 'Complete your language profile before starting a tutor session', code: 'LANGUAGE_PROFILE_REQUIRED' },
        { status: 409 },
      )
    }
    const tutorContext = buildTutorContext(languageResult.profile, parsed.targetLanguageCode)
    if (!tutorContext) {
      return NextResponse.json(
        { error: 'Target language is not in your language profile', code: 'INVALID_TARGET_LANGUAGE' },
        { status: 400 },
      )
    }

    const tutorResponse = await callTutor({
      ...tutorContext,
      mode: parsed.mode as Parameters<typeof callTutor>[0]['mode'],
      history: (parsed.history ?? []) as Parameters<typeof callTutor>[0]['history'],
      userMessage: parsed.action === 'message' ? parsed.message : undefined,
    })
    return NextResponse.json({ reply: tutorResponse.reply })
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
