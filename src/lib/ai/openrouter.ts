import 'server-only'
import { resolveModelChain } from './models'
import { resolveChainForTier, type ModelTier } from './model-registry'
import { buildSystemPrompt } from './prompts'
import { isCircuitOpen, recordModelFailure } from './circuit-breaker'
import { logModelMetric } from './model-metrics'
import { recordTutorCost } from './tutor-budget'
import type { PracticeMode, SupportedLanguage, TutorLevel } from '@/config/ai-practice'

export type HistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type TutorRequest = {
  targetLanguage: SupportedLanguage
  nativeLanguages: string[]
  explanationLanguage: string
  level: TutorLevel
  mode: PracticeMode
  history: HistoryMessage[]
  userMessage?: string
  /**
   * Caller's subscription tier (§21.3/§20.5). When omitted, behaviour is
   * unchanged from before this field existed — the full env-configured
   * chain is used, exactly as every existing caller and test already
   * assumes. Every real request path must pass this explicitly; the
   * permissive default exists only for backward compatibility, not as a
   * safe-by-default guarantee — see PROJECT_PASSPORT.md §21.4/roadmap #34.
   */
  tier?: ModelTier
  /**
   * §20.8 item 5 — plain-language labels of skills this learner has real
   * review history struggling with (from `getWeakSkillsSummary`), for a
   * short context line in the system prompt. Omit or leave empty for no
   * line at all — an empty/omitted array must never fabricate a weakness.
   */
  learnerWeakAreas?: string[]
}

export type TutorResponse = {
  reply: string
}

export type OpenRouterErrorCode =
  | 'RATE_LIMIT'
  | 'PROVIDER_ERROR'
  | 'MALFORMED_RESPONSE'
  | 'MISSING_CONFIG'
  | 'NO_CREDITS'
  | 'TIMEOUT'

export class OpenRouterError extends Error {
  readonly code: OpenRouterErrorCode
  readonly httpStatus?: number

  constructor(message: string, code: OpenRouterErrorCode, httpStatus?: number) {
    super(message)
    this.name = 'OpenRouterError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MAX_OUTPUT_TOKENS = 400
const TIMEOUT_MS = 25_000
const ERROR_BODY_LOG_LIMIT = 400

/**
 * Statuses that mean "this model can't serve the request" rather than "the
 * request is wrong". Only these advance to the next model in the chain: an
 * empty credit balance, a retired model id, or an upstream capacity problem is
 * survivable by trying a different model, and each fails in well under a second.
 *
 * Timeouts and malformed replies deliberately do NOT advance — the model did
 * respond, and walking a three-model chain of 25s timeouts would strand the
 * user for over a minute.
 */
function isModelUnavailable(status: number): boolean {
  return status === 402 || status === 404 || status === 429 || status >= 500
}

function classifyStatus(status: number): OpenRouterErrorCode {
  if (status === 402) return 'NO_CREDITS'
  if (status === 429) return 'RATE_LIMIT'
  return 'PROVIDER_ERROR'
}

function describeStatus(status: number, modelId: string): string {
  switch (classifyStatus(status)) {
    case 'NO_CREDITS':
      return `Model ${modelId} requires credits this account does not have`
    case 'RATE_LIMIT':
      return 'AI provider rate limit reached. Please wait a moment.'
    default:
      return `AI provider returned an error (${status})`
  }
}

/**
 * Logs why one model attempt failed. The provider's own error body is the only
 * place the real cause appears (an empty credit balance surfaces as a generic
 * 502 to the user), so it is worth recording — truncated, and never alongside
 * the request headers that carry the API key.
 */
function logAttemptFailure(modelId: string, status: number, body: string): void {
  console.error(
    `[AI] model ${modelId} failed with ${status}: ${body.slice(0, ERROR_BODY_LOG_LIMIT)}`,
  )
}

function requireApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured', 'MISSING_CONFIG')
  }
  return apiKey
}

function requireChain(tier?: ModelTier): string[] {
  const chain = tier ? resolveChainForTier(tier) : resolveModelChain('defaultTutor')
  if (chain.length === 0) {
    throw new OpenRouterError('No AI model is configured', 'MISSING_CONFIG')
  }
  return chain
}

function buildMessages(req: TutorRequest): { role: string; content: string }[] {
  const systemPrompt = buildSystemPrompt(
    req.targetLanguage,
    req.level,
    req.mode,
    req.nativeLanguages,
    req.explanationLanguage,
    req.learnerWeakAreas,
  )

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...req.history,
  ]
  if (req.userMessage !== undefined) {
    messages.push({ role: 'user', content: req.userMessage })
  }
  return messages
}

type OpenStreamResult = {
  body: ReadableStream<Uint8Array>
  modelId: string
  requestStartedAt: number
}

/**
 * Opens a streaming completion, walking the model chain by the same rules as
 * callTutor. Returns only once a model has accepted the request, so every
 * availability failure still surfaces as a thrown error before any bytes have
 * been committed to the caller's response.
 *
 * Also the roadmap #34/#35 (§21.4 Phase 1) integration point: a per-model
 * circuit breaker is checked before every attempt and fed on every
 * availability failure, and one `lm-model-metric` line is logged per
 * attempt that actually reaches the network.
 */
async function openStream(req: TutorRequest): Promise<OpenStreamResult> {
  const apiKey = requireApiKey()
  const chain = requireChain(req.tier)
  const messages = buildMessages(req)

  let lastError: OpenRouterError | null = null

  for (const modelId of chain) {
    if (await isCircuitOpen(modelId)) {
      console.error(`[AI] model ${modelId} skipped: circuit open`)
      continue
    }

    const attemptStartedAt = Date.now()
    const controller = new AbortController()
    // Bounds time to the response headers; cleared once the body starts, since
    // a long reply is not a stalled one.
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          max_tokens: MAX_OUTPUT_TOKENS,
          stream: true,
          usage: { include: true },
        }),
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenRouterError(
          `Request to ${modelId} timed out after ${TIMEOUT_MS / 1000} seconds`,
          'TIMEOUT',
        )
      }
      lastError = new OpenRouterError(
        'Network error communicating with AI provider',
        'PROVIDER_ERROR',
      )
      logAttemptFailure(modelId, 0, err instanceof Error ? err.message : String(err))
      await recordModelFailure(modelId)
      logModelMetric({
        modelId,
        gateway: 'openrouter',
        tier: req.tier,
        latencyMs: Date.now() - attemptStartedAt,
        outcome: 'advanced',
      })
      continue
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      logAttemptFailure(modelId, response.status, body)

      const error = new OpenRouterError(
        describeStatus(response.status, modelId),
        classifyStatus(response.status),
        response.status,
      )
      const latencyMs = Date.now() - attemptStartedAt
      if (!isModelUnavailable(response.status)) {
        logModelMetric({ modelId, gateway: 'openrouter', tier: req.tier, latencyMs, outcome: 'failed' })
        throw error
      }
      await recordModelFailure(modelId)
      logModelMetric({ modelId, gateway: 'openrouter', tier: req.tier, latencyMs, outcome: 'advanced' })
      lastError = error
      continue
    }

    if (!response.body) {
      lastError = new OpenRouterError('AI provider returned no stream', 'MALFORMED_RESPONSE')
      logAttemptFailure(modelId, response.status, 'empty body')
      await recordModelFailure(modelId)
      logModelMetric({
        modelId,
        gateway: 'openrouter',
        tier: req.tier,
        latencyMs: Date.now() - attemptStartedAt,
        outcome: 'advanced',
      })
      continue
    }

    return { body: response.body, modelId, requestStartedAt: attemptStartedAt }
  }

  throw lastError ?? new OpenRouterError('No AI model was able to answer', 'PROVIDER_ERROR')
}

/**
 * Yields reply text as the model produces it.
 *
 * A full reply takes 6-13 seconds, which is a long time to watch a spinner
 * during a conversation, so the words appear as they arrive.
 *
 * `onModelResolved`, if given, fires once — synchronously as soon as a model
 * has accepted the request — with the model id that will actually serve this
 * reply. Roadmap #35's only hook into this module: a caller further up the
 * stack (structured-tutor-reply.ts, for the explanation-language check) can
 * correlate its own quality metric to the model that produced it without
 * this function's return/yield contract changing.
 */
export async function* streamTutor(
  req: TutorRequest,
  onModelResolved?: (modelId: string) => void,
): AsyncGenerator<string> {
  const { body, modelId, requestStartedAt } = await openStream(req)
  onModelResolved?.(modelId)

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let firstDeltaAt: number | null = null
  let costUsd: number | undefined

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Server-sent events are newline delimited; the last fragment may be a
      // partial line, so it stays in the buffer until the rest arrives.
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue

        try {
          const parsed = JSON.parse(payload)
          const delta = parsed?.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta.length > 0) {
            if (firstDeltaAt === null) firstDeltaAt = Date.now()
            yield delta
          }
          // OpenRouter does not reliably include this on streamed responses
          // (a documented gateway limitation, not something this project can
          // fix) — captured opportunistically, never fabricated when absent.
          const cost = parsed?.usage?.cost
          if (typeof cost === 'number') costUsd = cost
        } catch {
          // Keep-alive comments and non-JSON frames are expected; skip them.
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  // Reached only when the loop above completed without throwing — a reader
  // error must not be reported as a successful attempt.
  logModelMetric({
    modelId,
    gateway: 'openrouter',
    tier: req.tier,
    latencyMs: Date.now() - requestStartedAt,
    ttftMs: firstDeltaAt !== null ? firstDeltaAt - requestStartedAt : undefined,
    outcome: 'success',
    costUsd,
  })
  // Roadmap #30 (§19.6.3): meter real spend, not just request count. Cost
  // is unknown until here — the reply has already reached the learner, so
  // this is bookkeeping for the *next* request's budget check, never a
  // reason to fail this one. Awaited (not fire-and-forget): a serverless
  // function can be frozen the moment its response finishes, which would
  // silently drop an un-awaited write.
  if (costUsd !== undefined) await recordTutorCost(costUsd)
}

export async function callTutor(req: TutorRequest): Promise<TutorResponse> {
  const apiKey = requireApiKey()
  const chain = requireChain(req.tier)
  const messages = buildMessages(req)

  let lastError: OpenRouterError | null = null

  for (const modelId of chain) {
    if (await isCircuitOpen(modelId)) {
      console.error(`[AI] model ${modelId} skipped: circuit open`)
      continue
    }

    const attemptStartedAt = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          max_tokens: MAX_OUTPUT_TOKENS,
          usage: { include: true },
        }),
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        throw new OpenRouterError(
          `Request to ${modelId} timed out after ${TIMEOUT_MS / 1000} seconds`,
          'TIMEOUT',
        )
      }
      lastError = new OpenRouterError(
        'Network error communicating with AI provider',
        'PROVIDER_ERROR',
      )
      logAttemptFailure(modelId, 0, err instanceof Error ? err.message : String(err))
      await recordModelFailure(modelId)
      logModelMetric({
        modelId,
        gateway: 'openrouter',
        tier: req.tier,
        latencyMs: Date.now() - attemptStartedAt,
        outcome: 'advanced',
      })
      continue
    }

    clearTimeout(timeoutId)

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      logAttemptFailure(modelId, response.status, body)

      const error = new OpenRouterError(
        describeStatus(response.status, modelId),
        classifyStatus(response.status),
        response.status,
      )

      const latencyMs = Date.now() - attemptStartedAt
      if (!isModelUnavailable(response.status)) {
        logModelMetric({ modelId, gateway: 'openrouter', tier: req.tier, latencyMs, outcome: 'failed' })
        throw error
      }
      await recordModelFailure(modelId)
      logModelMetric({ modelId, gateway: 'openrouter', tier: req.tier, latencyMs, outcome: 'advanced' })
      lastError = error
      continue
    }

    let data: unknown
    try {
      data = await response.json()
    } catch {
      throw new OpenRouterError('Malformed response from AI provider', 'MALFORMED_RESPONSE')
    }

    const reply = extractReply(data)
    if (!reply) {
      throw new OpenRouterError('AI provider returned an empty response', 'MALFORMED_RESPONSE')
    }

    const usageCost = (data as { usage?: { cost?: unknown } } | null)?.usage?.cost
    const costUsd = typeof usageCost === 'number' ? usageCost : undefined
    logModelMetric({
      modelId,
      gateway: 'openrouter',
      tier: req.tier,
      latencyMs: Date.now() - attemptStartedAt,
      outcome: 'success',
      costUsd,
    })
    // Roadmap #30 (§19.6.3) — see the matching comment in streamTutor.
    if (costUsd !== undefined) await recordTutorCost(costUsd)

    return { reply }
  }

  throw (
    lastError ??
    new OpenRouterError('No AI model was able to answer', 'PROVIDER_ERROR')
  )
}

function extractReply(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null

  const choices = (data as Record<string, unknown>).choices
  if (!Array.isArray(choices) || choices.length === 0) return null

  const choice = choices[0]
  if (typeof choice !== 'object' || choice === null) return null

  const message = (choice as Record<string, unknown>).message
  if (typeof message !== 'object' || message === null) return null

  const content = (message as Record<string, unknown>).content
  if (typeof content !== 'string' || content.trim().length === 0) return null

  return content.trim()
}
