import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const allowPasswordResetRequest = vi.fn()
const requestPasswordReset = vi.fn()

vi.mock('@/lib/auth-throttle', () => ({
  allowPasswordResetRequest: (...args: unknown[]) => allowPasswordResetRequest(...args),
}))
vi.mock('@/lib/password-reset.server', () => ({
  requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  allowPasswordResetRequest.mockReset().mockResolvedValue(true)
  requestPasswordReset.mockReset().mockResolvedValue(undefined)
})

describe('POST /api/auth/forgot-password', () => {
  it('returns the generic message and issues a reset when the account exists', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/reset link has been sent/i)
    expect(requestPasswordReset).toHaveBeenCalledWith('user@example.com')
  })

  it('returns the identical generic message when rate-limited, without attempting a reset', async () => {
    allowPasswordResetRequest.mockResolvedValue(false)
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/reset link has been sent/i)
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('rejects an invalid email with 400', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('rejects a missing email with 400', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('surfaces a 500 when the reset/email pipeline actually fails', async () => {
    requestPasswordReset.mockRejectedValue(new Error('smtp down'))
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })
})
