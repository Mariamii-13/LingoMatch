import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FREE_TUTOR_MODELS } from './models'

const isCircuitOpen = vi.fn()
const recordModelFailure = vi.fn()
vi.mock('./circuit-breaker', () => ({
  isCircuitOpen: (...args: unknown[]) => isCircuitOpen(...args),
  recordModelFailure: (...args: unknown[]) => recordModelFailure(...args),
}))

const logModelMetric = vi.fn()
vi.mock('./model-metrics', () => ({
  logModelMetric: (...args: unknown[]) => logModelMetric(...args),
}))

const { callTutor, OpenRouterError, streamTutor } = await import('./openrouter')

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
  isCircuitOpen.mockReset().mockResolvedValue(false)
  recordModelFailure.mockReset().mockResolvedValue(undefined)
  logModelMetric.mockReset()
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

function sseResponse(frames: string[]) {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const frame of frames) controller.enqueue(encoder.encode(frame))
        controller.close()
      },
    }),
    { status: 200 },
  )
}

function delta(content: string) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = []
  for await (const chunk of gen) out.push(chunk)
  return out
}

describe('streamTutor', () => {
  it('yields content deltas in order', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      sseResponse([delta('Hola'), delta(', '), delta('¿qué tal?'), 'data: [DONE]\n\n']),
    )
    await expect(collect(streamTutor(BASE_REQ))).resolves.toEqual(['Hola', ', ', '¿qué tal?'])
  })

  it('reassembles frames split across network chunks', async () => {
    const whole = delta('Buenos días')
    const cut = Math.floor(whole.length / 2)
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      sseResponse([whole.slice(0, cut), whole.slice(cut), 'data: [DONE]\n\n']),
    )
    await expect(collect(streamTutor(BASE_REQ))).resolves.toEqual(['Buenos días'])
  })

  it('ignores keep-alives, comments and empty deltas', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      sseResponse([
        ': ping\n\n',
        '\n',
        `data: ${JSON.stringify({ choices: [{ delta: {} }] })}\n\n`,
        delta(''),
        delta('Hola'),
        'data: [DONE]\n\n',
      ]),
    )
    await expect(collect(streamTutor(BASE_REQ))).resolves.toEqual(['Hola'])
  })

  it('requests a streaming completion', async () => {
    const spy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(sseResponse([delta('hi'), 'data: [DONE]\n\n']))
    await collect(streamTutor(BASE_REQ))
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.stream).toBe(true)
  })

  // Availability failures must surface before any bytes are committed, so the
  // route can still answer with a real HTTP status instead of a broken stream.
  it('throws rather than yielding when every model lacks credits', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async () =>
      jsonResponse({ error: { code: 402 } }, 402),
    )
    await expect(collect(streamTutor(BASE_REQ))).rejects.toMatchObject({
      code: 'NO_CREDITS',
    })
  })

  it('advances past an unavailable model before streaming', async () => {
    const spy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: { code: 402 } }, 402))
      .mockResolvedValueOnce(sseResponse([delta('Hola'), 'data: [DONE]\n\n']))

    await expect(collect(streamTutor(BASE_REQ))).resolves.toEqual(['Hola'])
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('throws MISSING_CONFIG without an API key', async () => {
    delete process.env.OPENROUTER_API_KEY
    await expect(collect(streamTutor(BASE_REQ))).rejects.toMatchObject({
      code: 'MISSING_CONFIG',
    })
  })
})

// Roadmap #34 (§21.3/§20.5): a 'free'-tier request must never reach an
// env-configured (paid) model, regardless of it being tried first in the
// unscoped chain — this is what makes the free-tier cost ceiling (§20.5) a
// real mechanism rather than an env-var convention.
describe('TutorRequest.tier hard filter', () => {
  it('skips the paid model entirely for tier: "free", going straight to the free chain', async () => {
    const spy = mockFetch(MOCK_VALID_RESPONSE)
    const result = await callTutor({ ...BASE_REQ, tier: 'free' })
    expect(result.reply).toBe('Hello! How can I help you practise today?')
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe(FREE_TUTOR_MODELS[0])
  })

  it('still tries the configured paid model first for tier: "paid"', async () => {
    const spy = mockFetch(MOCK_VALID_RESPONSE)
    await callTutor({ ...BASE_REQ, tier: 'paid' })
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe('google/gemini-2.5-flash')
  })

  it('preserves today\'s exact behaviour (full env chain) when tier is omitted, for backward compatibility', async () => {
    const spy = mockFetch(MOCK_VALID_RESPONSE)
    await callTutor(BASE_REQ)
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe('google/gemini-2.5-flash')
  })

  it('a free-tier caller never falls through to the paid model even if every free model fails', async () => {
    const spy = mockFetchAlways({ error: { code: 500 } }, 500)
    await expect(callTutor({ ...BASE_REQ, tier: 'free' })).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
    })
    const modelsCalled = spy.mock.calls.map(
      (call) => JSON.parse((call[1] as RequestInit).body as string).model,
    )
    expect(modelsCalled).not.toContain('google/gemini-2.5-flash')
    expect(modelsCalled).toEqual([...FREE_TUTOR_MODELS])
  })
})

// Roadmap #34 (§21.4 Phase 1, remaining piece): a model whose circuit is
// already open must be skipped without spending a network attempt on it.
describe('circuit breaker integration', () => {
  it('skips a model whose circuit is open and tries the next one', async () => {
    isCircuitOpen.mockImplementation(async (modelId: string) => modelId === 'google/gemini-2.5-flash')
    const spy = mockFetch(MOCK_VALID_RESPONSE)

    const result = await callTutor(BASE_REQ)

    expect(result.reply).toBe('Hello! How can I help you practise today?')
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe(FREE_TUTOR_MODELS[0])
  })

  it('records a failure against the circuit breaker on an availability failure', async () => {
    const spy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: { code: 402 } }, 402))
      .mockResolvedValueOnce(jsonResponse(MOCK_VALID_RESPONSE, 200))

    await callTutor(BASE_REQ)

    expect(spy).toHaveBeenCalledTimes(2)
    expect(recordModelFailure).toHaveBeenCalledWith('google/gemini-2.5-flash')
  })

  it('does not record a circuit-breaker failure for a non-recoverable client error', async () => {
    mockFetchAlways({ error: 'bad request' }, 400)
    await expect(callTutor(BASE_REQ)).rejects.toThrow()
    expect(recordModelFailure).not.toHaveBeenCalled()
  })
})

// Roadmap #35 (§21.4 Phase 1): the prerequisite for evidence-driven routing.
describe('lm-model-metric logging', () => {
  it('logs a success metric with latency for a successful callTutor attempt', async () => {
    mockFetch(MOCK_VALID_RESPONSE)
    await callTutor({ ...BASE_REQ, tier: 'paid' })

    expect(logModelMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'google/gemini-2.5-flash',
        gateway: 'openrouter',
        tier: 'paid',
        outcome: 'success',
        latencyMs: expect.any(Number),
      }),
    )
  })

  it('logs an advanced metric for a model that failed but let the chain continue', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: { code: 402 } }, 402))
      .mockResolvedValueOnce(jsonResponse(MOCK_VALID_RESPONSE, 200))

    await callTutor(BASE_REQ)

    expect(logModelMetric).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: 'google/gemini-2.5-flash', outcome: 'advanced' }),
    )
  })

  it('logs a failed metric for a non-recoverable error and does not log success', async () => {
    mockFetchAlways({ error: 'bad request' }, 400)
    await expect(callTutor(BASE_REQ)).rejects.toThrow()

    expect(logModelMetric).toHaveBeenCalledWith(
      expect.objectContaining({ modelId: 'google/gemini-2.5-flash', outcome: 'failed' }),
    )
    expect(logModelMetric).not.toHaveBeenCalledWith(expect.objectContaining({ outcome: 'success' }))
  })

  it('logs a success metric with ttftMs for a streamed reply', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      sseResponse([delta('Hola'), 'data: [DONE]\n\n']),
    )
    await collect(streamTutor(BASE_REQ))

    expect(logModelMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'google/gemini-2.5-flash',
        outcome: 'success',
        latencyMs: expect.any(Number),
        ttftMs: expect.any(Number),
      }),
    )
  })

  it('invokes onModelResolved once the winning model is known, before streaming completes', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      sseResponse([delta('Hola'), 'data: [DONE]\n\n']),
    )
    const onModelResolved = vi.fn()
    await collect(streamTutor(BASE_REQ, onModelResolved))
    expect(onModelResolved).toHaveBeenCalledWith('google/gemini-2.5-flash')
  })
})
