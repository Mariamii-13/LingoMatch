import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ERROR_LOG_PREFIX } from './error-report'
import { internalErrorResponse, reportClientError, reportServerError } from './report.server'

const WEBHOOK = 'https://hooks.example.test/errors'

function loggedEvents(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls
    .map((call) => String(call[0]))
    .filter((line) => line.startsWith(`${ERROR_LOG_PREFIX} `))
    .map((line) => JSON.parse(line.slice(ERROR_LOG_PREFIX.length + 1)))
}

describe('reportServerError', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    delete process.env.ERROR_REPORT_WEBHOOK_URL
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.ERROR_REPORT_WEBHOOK_URL
  })

  it('logs one structured line and returns the id that identifies it', () => {
    const id = reportServerError('api/friends POST', new Error('mongo down'))

    const events = loggedEvents(errorSpy)
    expect(events).toHaveLength(1)
    expect(events[0].id).toBe(id)
    expect(events[0].origin).toBe('server')
    expect(events[0].scope).toBe('api/friends POST')
    expect(events[0].message).toBe('mongo down')
  })

  it('carries the render digest so a user-quoted reference finds the log line', () => {
    reportServerError('render /dashboard', new Error('boom'), { digest: '2891374611' })
    expect(loggedEvents(errorSpy)[0].digest).toBe('2891374611')
  })

  it('keeps credentials out of the log line', () => {
    reportServerError(
      'api/db',
      new Error('failed to connect to mongodb+srv://lingo:s3cr3tPass@cluster0.mongodb.net/test')
    )

    const line = String(errorSpy.mock.calls[0][0])
    expect(line).not.toContain('s3cr3tPass')
  })

  it('marks browser failures as client-origin', () => {
    reportClientError('boundary', new Error('render crashed'))
    expect(loggedEvents(errorSpy)[0].origin).toBe('client')
  })

  it('does not call out anywhere when no webhook is configured', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    reportServerError('api', new Error('x'))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('forwards the event to a configured webhook', async () => {
    process.env.ERROR_REPORT_WEBHOOK_URL = WEBHOOK
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    const id = reportServerError('api', new Error('x'))
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1))

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(WEBHOOK)
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body)).id).toBe(id)
  })

  it('never lets a failing webhook become a second failure', async () => {
    process.env.ERROR_REPORT_WEBHOOK_URL = WEBHOOK
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    expect(() => reportServerError('api', new Error('x'))).not.toThrow()
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    // The original event still reached the log even though delivery failed.
    expect(loggedEvents(errorSpy)).toHaveLength(1)
  })
})

describe('internalErrorResponse', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    delete process.env.ERROR_REPORT_WEBHOOK_URL
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a 500 quoting the same id that was logged', async () => {
    const response = internalErrorResponse('api/friends GET', new Error('mongo down'))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Internal server error')
    expect(body.errorId).toBe(loggedEvents(errorSpy)[0].id)
  })

  it('lets a route keep its own wording without losing the reference', async () => {
    const response = internalErrorResponse('api/user/me language-profile PUT', new Error('x'), {
      message: 'Failed to save language profile',
    })

    const body = await response.json()
    expect(body.error).toBe('Failed to save language profile')
    expect(body.errorId).toBe(loggedEvents(errorSpy)[0].id)
  })

  it('never leaks the underlying message to the caller', async () => {
    const response = internalErrorResponse('api', new Error('connection string mongodb://a:b@c/d'))
    const body = await response.json()

    expect(JSON.stringify(body)).not.toContain('mongodb')
  })
})
