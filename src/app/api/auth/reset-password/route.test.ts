import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const allowPasswordResetAttempt = vi.fn()
const performPasswordReset = vi.fn()

vi.mock('@/lib/auth-throttle', () => ({
  allowPasswordResetAttempt: (...args: unknown[]) => allowPasswordResetAttempt(...args),
}))
vi.mock('@/lib/password-reset.server', () => ({
  performPasswordReset: (...args: unknown[]) => performPasswordReset(...args),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  allowPasswordResetAttempt.mockReset().mockResolvedValue(true)
  performPasswordReset.mockReset().mockResolvedValue({ success: true })
})

describe('POST /api/auth/reset-password', () => {
  it('returns 200 on a valid token and password', async () => {
    const res = await POST(makeRequest({ token: 'good-token', password: 'newpassword123' }))
    expect(res.status).toBe(200)
    expect(performPasswordReset).toHaveBeenCalledWith('good-token', 'newpassword123')
  })

  it('returns 400 for an invalid or expired token', async () => {
    performPasswordReset.mockResolvedValue({ success: false, reason: 'invalid-or-expired' })
    const res = await POST(makeRequest({ token: 'bad-token', password: 'newpassword123' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid or expired/i)
  })

  it('returns 400 when the password is too short', async () => {
    const res = await POST(makeRequest({ token: 'good-token', password: 'short' }))
    expect(res.status).toBe(400)
    expect(performPasswordReset).not.toHaveBeenCalled()
  })

  it('returns 400 when the token is missing', async () => {
    const res = await POST(makeRequest({ password: 'newpassword123' }))
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate-limited, without attempting the reset', async () => {
    allowPasswordResetAttempt.mockResolvedValue(false)
    const res = await POST(makeRequest({ token: 'good-token', password: 'newpassword123' }))
    expect(res.status).toBe(429)
    expect(performPasswordReset).not.toHaveBeenCalled()
  })
})
