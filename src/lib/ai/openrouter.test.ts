import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callTutor, OpenRouterError } from './openrouter'

const MOCK_VALID_RESPONSE = {
  choices: [{ message: { content: 'Hello! How can I help you practise today?' } }],
}

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
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
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.OPENROUTER_API_KEY
  delete process.env.AI_MODEL_DEFAULT
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

  it('throws MISSING_CONFIG when model env absent', async () => {
    delete process.env.AI_MODEL_DEFAULT
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'MISSING_CONFIG',
    })
  })

  it('throws RATE_LIMIT on 429', async () => {
    mockFetch({ error: 'rate limited' }, 429)
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'RATE_LIMIT',
      httpStatus: 429,
    })
  })

  it('throws PROVIDER_ERROR on 500', async () => {
    mockFetch({ error: 'internal error' }, 500)
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
      httpStatus: 500,
    })
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

  it('throws PROVIDER_ERROR on network failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network fail'))
    await expect(callTutor(BASE_REQ)).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
    })
  })

  it('does not auto-retry after timeout — throws exactly once', async () => {
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
    mockFetch({ error: 'fail' }, 500)
    await expect(callTutor(BASE_REQ)).rejects.toThrow()
    for (const call of consoleSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('test-key')
    }
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
