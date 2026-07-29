import { describe, it, expect, vi, beforeEach } from 'vitest'

const checkRateLimit = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rateLimit', () => ({ checkRateLimit }))

import {
  LOGIN_ATTEMPTS_PER_EMAIL,
  LOGIN_ATTEMPTS_PER_IP,
  LOGIN_WINDOW_SECS,
  REGISTRATIONS_PER_IP,
  REGISTER_WINDOW_SECS,
  allowLoginAttempt,
  allowRegistration,
} from './auth-throttle'
import { getClientIp, hashSubject } from './request-identity'

function allowAll() {
  checkRateLimit.mockResolvedValue({ allowed: true, remaining: 5 })
}

function denyOnly(action: string) {
  checkRateLimit.mockImplementation(async (name: string) => ({
    allowed: name !== action,
    remaining: 0,
  }))
}

function actionsCalled(): string[] {
  return checkRateLimit.mock.calls.map((call) => call[0] as string)
}

beforeEach(() => {
  checkRateLimit.mockReset()
  process.env.AUTH_SECRET = 'test-secret'
})

describe('allowLoginAttempt', () => {
  it('allows an attempt within both limits', async () => {
    allowAll()
    await expect(allowLoginAttempt('a@example.com', '1.2.3.4')).resolves.toBe(true)
  })

  it('applies the documented limits and window', async () => {
    allowAll()
    await allowLoginAttempt('a@example.com', '1.2.3.4')

    expect(checkRateLimit).toHaveBeenCalledWith(
      'login-email',
      expect.any(String),
      LOGIN_ATTEMPTS_PER_EMAIL,
      LOGIN_WINDOW_SECS,
    )
    expect(checkRateLimit).toHaveBeenCalledWith(
      'login-ip',
      expect.any(String),
      LOGIN_ATTEMPTS_PER_IP,
      LOGIN_WINDOW_SECS,
    )
  })

  it('blocks one account being hammered from many addresses', async () => {
    denyOnly('login-email')
    await expect(allowLoginAttempt('a@example.com', '1.2.3.4')).resolves.toBe(false)
  })

  it('blocks many accounts being probed from one address', async () => {
    denyOnly('login-ip')
    await expect(allowLoginAttempt('a@example.com', '1.2.3.4')).resolves.toBe(false)
  })

  it('stops at the email limit without consuming the address limit', async () => {
    denyOnly('login-email')
    await allowLoginAttempt('a@example.com', '1.2.3.4')
    expect(actionsCalled()).toEqual(['login-email'])
  })

  it('treats an email as one subject regardless of case', async () => {
    allowAll()
    await allowLoginAttempt('Person@Example.com', '1.2.3.4')
    await allowLoginAttempt('person@example.com', '1.2.3.4')

    const emailKeys = checkRateLimit.mock.calls
      .filter((call) => call[0] === 'login-email')
      .map((call) => call[1])
    expect(emailKeys[0]).toBe(emailKeys[1])
  })

  it('keeps different emails on separate counters', async () => {
    allowAll()
    await allowLoginAttempt('one@example.com', '1.2.3.4')
    await allowLoginAttempt('two@example.com', '1.2.3.4')

    const emailKeys = checkRateLimit.mock.calls
      .filter((call) => call[0] === 'login-email')
      .map((call) => call[1])
    expect(emailKeys[0]).not.toBe(emailKeys[1])
  })
})

describe('allowRegistration', () => {
  it('allows a registration within the limit', async () => {
    allowAll()
    await expect(allowRegistration('1.2.3.4')).resolves.toBe(true)
  })

  it('applies the documented limit and window', async () => {
    allowAll()
    await allowRegistration('1.2.3.4')
    expect(checkRateLimit).toHaveBeenCalledWith(
      'register-ip',
      expect.any(String),
      REGISTRATIONS_PER_IP,
      REGISTER_WINDOW_SECS,
    )
  })

  it('blocks once an address has created too many accounts', async () => {
    denyOnly('register-ip')
    await expect(allowRegistration('1.2.3.4')).resolves.toBe(false)
  })
})

describe('hashSubject', () => {
  // Rate-limit documents persist for the window, so they must not carry the
  // address or email address that produced them.
  it('does not contain the original value', () => {
    const hashed = hashSubject('person@example.com')
    expect(hashed).not.toContain('person')
    expect(hashed).not.toContain('example.com')
  })

  it('is stable for the same value', () => {
    expect(hashSubject('1.2.3.4')).toBe(hashSubject('1.2.3.4'))
  })

  it('differs between values', () => {
    expect(hashSubject('1.2.3.4')).not.toBe(hashSubject('1.2.3.5'))
  })

  it('is scoped to the deployment secret', () => {
    const withOne = hashSubject('1.2.3.4')
    process.env.AUTH_SECRET = 'a-different-secret'
    expect(hashSubject('1.2.3.4')).not.toBe(withOne)
  })
})

describe('getClientIp', () => {
  it('takes the client from the first x-forwarded-for entry', () => {
    // Later entries are proxies and must not be trusted as the origin.
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1, 10.0.0.2' })
    expect(getClientIp(headers)).toBe('203.0.113.9')
  })

  it('falls back to x-real-ip', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9')
  })

  it('returns a stable placeholder when no address is present', () => {
    expect(getClientIp(new Headers())).toBe('unknown')
  })

  it('ignores an empty x-forwarded-for', () => {
    expect(getClientIp(new Headers({ 'x-forwarded-for': '' }))).toBe('unknown')
  })
})
