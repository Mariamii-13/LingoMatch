import 'server-only'
import { resolveModel } from './models'
import { buildSystemPrompt } from './prompts'
import type { CEFRLevel, PracticeMode, SupportedLanguage } from '@/config/ai-practice'

export type HistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type TutorRequest = {
  language: SupportedLanguage
  level: CEFRLevel
  mode: PracticeMode
  history: HistoryMessage[]
  userMessage?: string
}

export type TutorResponse = {
  reply: string
}

export type OpenRouterErrorCode =
  | 'RATE_LIMIT'
  | 'PROVIDER_ERROR'
  | 'MALFORMED_RESPONSE'
  | 'MISSING_CONFIG'
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
const TIMEOUT_MS = 10_000

export async function callTutor(req: TutorRequest): Promise<TutorResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not configured', 'MISSING_CONFIG')
  }

  let modelId: string
  try {
    modelId = resolveModel('defaultTutor')
  } catch {
    throw new OpenRouterError('AI model is not configured', 'MISSING_CONFIG')
  }
  const systemPrompt = buildSystemPrompt(req.language, req.level, req.mode)

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...req.history,
  ]
  if (req.userMessage !== undefined) {
    messages.push({ role: 'user', content: req.userMessage })
  }

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
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OpenRouterError('Request timed out after 10 seconds', 'TIMEOUT')
    }
    throw new OpenRouterError('Network error communicating with AI provider', 'PROVIDER_ERROR')
  }

  clearTimeout(timeoutId)

  if (response.status === 429) {
    throw new OpenRouterError(
      'AI provider rate limit reached. Please wait a moment.',
      'RATE_LIMIT',
      429,
    )
  }
  if (!response.ok) {
    throw new OpenRouterError(
      `AI provider returned an error (${response.status})`,
      'PROVIDER_ERROR',
      response.status,
    )
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

  return { reply }
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
