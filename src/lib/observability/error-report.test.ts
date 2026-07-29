import { describe, it, expect } from 'vitest'
import {
  ERROR_LOG_PREFIX,
  MAX_MESSAGE_LENGTH,
  MAX_STACK_LENGTH,
  buildErrorEvent,
  describeError,
  formatErrorLog,
  newErrorId,
  pickSafeHeaders,
  redactSecrets,
} from './error-report'

describe('newErrorId', () => {
  it('produces a short lowercase hex id', () => {
    expect(newErrorId()).toMatch(/^[0-9a-f]{12}$/)
  })

  it('does not repeat itself across many calls', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newErrorId()))
    expect(ids.size).toBe(500)
  })
})

describe('redactSecrets', () => {
  it('masks the credentials in a MongoDB connection string', () => {
    const text =
      'MongooseServerSelectionError: could not connect to mongodb+srv://lingo:s3cr3tPass@cluster0.abc.mongodb.net/test'
    const redacted = redactSecrets(text, [])

    expect(redacted).not.toContain('s3cr3tPass')
    expect(redacted).not.toContain('lingo:')
    expect(redacted).toContain('mongodb+srv://***:***@cluster0.abc.mongodb.net/test')
  })

  it('masks a plain mongodb:// connection string too', () => {
    const redacted = redactSecrets('mongodb://admin:hunter2@localhost:27017/test', [])
    expect(redacted).not.toContain('hunter2')
    expect(redacted).toContain('mongodb://***:***@localhost:27017/test')
  })

  it('masks bearer tokens', () => {
    const redacted = redactSecrets('401 from provider (Authorization: Bearer abc.def-123_XYZ)', [])
    expect(redacted).not.toContain('abc.def-123_XYZ')
    expect(redacted).toContain('Bearer [redacted]')
  })

  it('masks OpenRouter-shaped api keys wherever they appear', () => {
    const redacted = redactSecrets('request failed with key sk-or-v1-0123456789abcdef in body', [])
    expect(redacted).not.toContain('sk-or-v1-0123456789abcdef')
    expect(redacted).toContain('[redacted-key]')
  })

  it('masks any configured secret value that leaks into the text', () => {
    const redacted = redactSecrets('upstream said: signature mismatch for AbcdEfgh12345678', [
      'AbcdEfgh12345678',
    ])
    expect(redacted).not.toContain('AbcdEfgh12345678')
    expect(redacted).toContain('[redacted]')
  })

  it('ignores short or empty secret values so it cannot blank out ordinary text', () => {
    // A one or two character "secret" would otherwise replace half the message.
    const redacted = redactSecrets('a normal message about a user', ['a', '', 'user'])
    expect(redacted).toBe('a normal message about a user')
  })

  it('returns non-string input unchanged as an empty string', () => {
    expect(redactSecrets('', [])).toBe('')
  })
})

describe('pickSafeHeaders', () => {
  it('keeps diagnostic headers and drops credential-bearing ones', () => {
    const safe = pickSafeHeaders({
      'user-agent': 'Mozilla/5.0',
      referer: 'https://lingomatch.app/dashboard',
      'accept-language': 'en-GB',
      cookie: 'authjs.session-token=supersecret',
      authorization: 'Bearer nope',
      'x-forwarded-for': '203.0.113.7',
      'x-api-key': 'nope',
    })

    expect(safe).toEqual({
      'user-agent': 'Mozilla/5.0',
      referer: 'https://lingomatch.app/dashboard',
      'accept-language': 'en-GB',
    })
  })

  it('never keeps the client address, which is personal data', () => {
    const safe = pickSafeHeaders({ 'x-forwarded-for': '203.0.113.7', 'x-real-ip': '203.0.113.7' })
    expect(Object.keys(safe)).toHaveLength(0)
  })

  it('is case insensitive and joins repeated headers', () => {
    const safe = pickSafeHeaders({ 'User-Agent': ['one', 'two'] })
    expect(safe['user-agent']).toBe('one, two')
  })

  it('accepts a Headers instance', () => {
    const headers = new Headers({ 'user-agent': 'curl/8', cookie: 'a=b' })
    expect(pickSafeHeaders(headers)).toEqual({ 'user-agent': 'curl/8' })
  })

  it('tolerates missing headers', () => {
    expect(pickSafeHeaders(undefined)).toEqual({})
  })
})

describe('describeError', () => {
  it('reads name, message and stack from an Error', () => {
    const described = describeError(new TypeError('boom'))
    expect(described.name).toBe('TypeError')
    expect(described.message).toBe('boom')
    expect(described.stack).toContain('TypeError: boom')
  })

  it('handles a thrown string', () => {
    expect(describeError('just a string')).toEqual({
      name: 'NonError',
      message: 'just a string',
      stack: undefined,
    })
  })

  it('handles a thrown object without a message', () => {
    const described = describeError({ code: 11000 })
    expect(described.name).toBe('NonError')
    expect(described.message).toContain('11000')
  })

  it('handles null and undefined', () => {
    expect(describeError(null).message).toBe('null')
    expect(describeError(undefined).message).toBe('undefined')
  })
})

describe('buildErrorEvent', () => {
  it('assembles the fields an operator needs to find the failure', () => {
    const event = buildErrorEvent({
      origin: 'server',
      scope: 'render /dashboard',
      error: new Error('database unavailable'),
      digest: '1234567890',
      request: { path: '/dashboard?tab=1', method: 'GET', headers: { 'user-agent': 'curl/8' } },
      context: { routeType: 'render', routerKind: 'App Router' },
      now: new Date('2026-07-29T10:00:00.000Z'),
    })

    expect(event.id).toMatch(/^[0-9a-f]{12}$/)
    expect(event.at).toBe('2026-07-29T10:00:00.000Z')
    expect(event.origin).toBe('server')
    expect(event.scope).toBe('render /dashboard')
    expect(event.name).toBe('Error')
    expect(event.message).toBe('database unavailable')
    expect(event.digest).toBe('1234567890')
    expect(event.path).toBe('/dashboard?tab=1')
    expect(event.method).toBe('GET')
    expect(event.headers).toEqual({ 'user-agent': 'curl/8' })
    expect(event.context).toEqual({ routeType: 'render', routerKind: 'App Router' })
  })

  it('uses the caller-supplied id so a response can quote the same reference', () => {
    const event = buildErrorEvent({ origin: 'server', scope: 'api', error: new Error('x'), id: 'abc123abc123' })
    expect(event.id).toBe('abc123abc123')
  })

  it('redacts secrets out of the message and the stack', () => {
    const error = new Error('connect failed: mongodb+srv://lingo:s3cr3tPass@cluster0.mongodb.net')
    error.stack = `Error: connect failed: mongodb+srv://lingo:s3cr3tPass@cluster0.mongodb.net\n    at db.ts:1:1`

    const event = buildErrorEvent({ origin: 'server', scope: 'api', error, secrets: [] })

    expect(event.message).not.toContain('s3cr3tPass')
    expect(event.stack).not.toContain('s3cr3tPass')
  })

  it('truncates a very long message and stack so one error cannot flood the log', () => {
    const error = new Error('x'.repeat(MAX_MESSAGE_LENGTH + 500))
    error.stack = 'y'.repeat(MAX_STACK_LENGTH + 5000)

    const event = buildErrorEvent({ origin: 'server', scope: 'api', error })

    expect(event.message.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH + 1)
    expect(event.message.endsWith('…')).toBe(true)
    expect(event.stack!.length).toBeLessThanOrEqual(MAX_STACK_LENGTH + 1)
  })

  it('omits empty optional fields rather than writing nulls', () => {
    const event = buildErrorEvent({ origin: 'client', scope: 'boundary', error: new Error('x') })

    expect(event).not.toHaveProperty('digest')
    expect(event).not.toHaveProperty('path')
    expect(event).not.toHaveProperty('method')
    expect(event).not.toHaveProperty('headers')
    expect(event).not.toHaveProperty('context')
  })
})

describe('formatErrorLog', () => {
  it('emits one greppable line so a multi-line stack cannot split the record', () => {
    const event = buildErrorEvent({
      origin: 'server',
      scope: 'api/friends POST',
      error: new Error('line one\nline two'),
    })

    const line = formatErrorLog(event)

    expect(line.startsWith(`${ERROR_LOG_PREFIX} `)).toBe(true)
    expect(line).not.toContain('\n')
    expect(JSON.parse(line.slice(ERROR_LOG_PREFIX.length + 1)).scope).toBe('api/friends POST')
  })

  it('survives a value that cannot be serialised', () => {
    const circular: Record<string, unknown> = { name: 'loop' }
    circular.self = circular

    const event = buildErrorEvent({
      origin: 'server',
      scope: 'api',
      error: new Error('x'),
      context: circular,
    })

    const line = formatErrorLog(event)
    expect(line.startsWith(`${ERROR_LOG_PREFIX} `)).toBe(true)
    expect(line).toContain(event.id)
  })
})
