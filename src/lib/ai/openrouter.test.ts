import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callTutor, OpenRouterError } from './openrouter'
import { FREE_TUTOR_MODELS } from './models'

const MOCK_VALID_RESPONSE = {
  choices: [{ message: { content: 'Hello! How can I help you practise today?' } }],
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Mocks a single attempt; later attempts in the chain fall through. */
function mockFetch(body: unknown, status = 200) {
  return vi
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(jsonResponse(body, status))
}

/**
 * Mocks every attempt with the same response. Needed for failure cases: a
 * model-unavailable status walks the whole chain, so a one-shot mock would let
 * later attempts hit the network.
 */
function mockFetchAlways(body: unknown, status: number) {
  return vi
    .spyOn(global, 'fetch')
    .mockImplementation(async () => jsonResponse(body, status))
}

const BASE_REQ = {
  targetLanguage: 'Spanish',
  nativeLanguages: ['English'],
  explanationLanguage: 'English',
  level: 'B1' as const,
  mode: 'Free Conversation' as const,
  history: [] as { role: 'user' | 'assistant'; content: string }[],
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = 'test-key'
  process.env.AI_MODEL_DEFAULT = 'google/gemini-2.5-flash'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.OPENROUTER_API_KEY
  delete process.env.AI_MODEL_DEFAULT
  delete process.env.AI_MODEL_FALLBACKS
})

describe('callTutor', () => {
  it('returns reply on successful response', async () => {
    mockFetch(MOCK_VALID_RESPONSE)
    const result = await callTutor(BASE_REQ)
    expect(result.reply).toBe('Hello! How can I help you practise today?')
  })

  it('throws MISSING_CONFIG when API key absent', async () => {
    delete process.env.OPENROUTER_API_KEY
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'MISSING_CONFIG',
    })
  })

  it('falls back to a free model when no model env is set', async () => {
    delete process.env.AI_MODEL_DEFAULT
    const spy = mockFetch(MOCK_VALID_RESPONSE)
    const result = await callTutor(BASE_REQ)
    expect(result.reply).toBe('Hello! How can I help you practise today?')
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe(FREE_TUTOR_MODELS[0])
  })

  it('tries the configured model first', async () => {
    const spy = mockFetch(MOCK_VALID_RESPONSE)
    await callTutor(BASE_REQ)
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe('google/gemini-2.5-flash')
  })

  it('advances to the next model when the configured one has no credits', async () => {
    const spy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: { code: 402 } }, 402))
      .mockResolvedValueOnce(jsonResponse(MOCK_VALID_RESPONSE, 200))

    const result = await callTutor(BASE_REQ)

    expect(result.reply).toBe('Hello! How can I help you practise today?')
    expect(spy).toHaveBeenCalledTimes(2)
    const second = JSON.parse((spy.mock.calls[1][1] as RequestInit).body as string)
    expect(second.model).toBe(FREE_TUTOR_MODELS[0])
  })

  it('advances past a retired model id (404)', async () => {
    const spy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: { code: 404 } }, 404))
      .mockResolvedValueOnce(jsonResponse(MOCK_VALID_RESPONSE, 200))

    await expect(callTutor(BASE_REQ)).resolves.toMatchObject({
      reply: 'Hello! How can I help you practise today?',
    })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('throws NO_CREDITS when every model lacks credits', async () => {
    mockFetchAlways({ error: { code: 402 } }, 402)
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'NO_CREDITS',
      httpStatus: 402,
    })
  })

  it('throws RATE_LIMIT when every model is rate limited', async () => {
    mockFetchAlways({ error: 'rate limited' }, 429)
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'RATE_LIMIT',
      httpStatus: 429,
    })
  })

  it('throws PROVIDER_ERROR when every model returns 500', async () => {
    mockFetchAlways({ error: 'internal error' }, 500)
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
      httpStatus: 500,
    })
  })

  it('does not advance on a client error such as 400', async () => {
    const spy = mockFetchAlways({ error: 'bad request' }, 400)
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
      httpStatus: 400,
    })
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('honours AI_MODEL_FALLBACKS before the built-in free models', async () => {
    process.env.AI_MODEL_FALLBACKS = 'my/backup-model'
    const spy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: { code: 402 } }, 402))
      .mockResolvedValueOnce(jsonResponse(MOCK_VALID_RESPONSE, 200))

    await callTutor(BASE_REQ)

    const second = JSON.parse((spy.mock.calls[1][1] as RequestInit).body as string)
    expect(second.model).toBe('my/backup-model')
  })

  it('does not retry the same model twice when env duplicates a free model', async () => {
    process.env.AI_MODEL_DEFAULT = FREE_TUTOR_MODELS[0]
    const spy = mockFetchAlways({ error: { code: 402 } }, 402)

    await expect(callTutor(BASE_REQ)).rejects.toThrow()

    const models = spy.mock.calls.map(
      (call) => JSON.parse((call[1] as RequestInit).body as string).model,
    )
    expect(new Set(models).size).toBe(models.length)
    expect(models.length).toBe(FREE_TUTOR_MODELS.length)
  })

  it('throws MALFORMED_RESPONSE when choices missing', async () => {
    mockFetch({ unexpected: true })
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    })
  })

  it('throws MALFORMED_RESPONSE when choices empty', async () => {
    mockFetch({ choices: [] })
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    })
  })

  it('throws MALFORMED_RESPONSE when content is empty string', async () => {
    mockFetch({ choices: [{ message: { content: '   ' } }] })
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    })
  })

  it('throws MALFORMED_RESPONSE when response body is not JSON', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('not json', { status: 200 }),
    )
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'MALFORMED_RESPONSE',
    })
  })

  it('throws TIMEOUT on AbortError', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    )
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'TIMEOUT',
    })
  })

  it('advances to the next model on network failure', async () => {
    const spy = vi
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('network fail'))
      .mockResolvedValueOnce(jsonResponse(MOCK_VALID_RESPONSE, 200))

    await expect(callTutor(BASE_REQ)).resolves.toMatchObject({
      reply: 'Hello! How can I help you practise today?',
    })
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('throws PROVIDER_ERROR when every model fails to connect', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network fail'))
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
    })
  })

  it('does not walk the chain after a timeout — throws on the first attempt', async () => {
    const spy = vi.spyOn(global, 'fetch').mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    )
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({ code: 'TIMEOUT' })
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('sends userMessage in messages array when provided', async () => {
    const spy = mockFetch(MOCK_VALID_RESPONSE)
    await callTutor({ ...BASE_REQ, userMessage: 'Hola' })
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    const lastMsg = body.messages[body.messages.length - 1]
    expect(lastMsg).toMatchObject({ role: 'user', content: 'Hola' })
  })

  it('does not send userMessage when undefined (start action)', async () => {
    const spy = mockFetch(MOCK_VALID_RESPONSE)
    await callTutor(BASE_REQ)
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    const last = body.messages[body.messages.length - 1]
    expect(last.role).toBe('system')
  })

  it('does not log Authorization header', async () => {
    const consoleSpy = vi.spyOn(console, 'error')
    mockFetchAlways({ error: 'fail' }, 500)
    await expect(callTutor(BASE_REQ)).rejects.toThrow()
    for (const call of consoleSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('test-key')
    }
  })

  it('logs the provider error body so the real cause is recoverable', async () => {
    const consoleSpy = vi.spyOn(console, 'error')
    mockFetchAlways({ error: { message: 'Insufficient credits' } }, 402)
    await expect(callTutor(BASE_REQ)).rejects.toThrow()
    expect(JSON.stringify(consoleSpy.mock.calls)).toContain('Insufficient credits')
  })

  it('is an instance of OpenRouterError', async () => {
    delete process.env.OPENROUTER_API_KEY
    try {
      await callTutor(BASE_REQ)
    } catch (e) {
      expect(e).toBeInstanceOf(OpenRouterError)
    }
  })
})
