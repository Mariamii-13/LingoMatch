import { describe, it, expect, vi, beforeEach } from 'vitest'

const connectDB = vi.fn()
const findOneAndUpdate = vi.fn()

vi.mock('./db', () => ({ connectDB: () => connectDB() }))
vi.mock('./models/RateLimit', () => ({
  default: { findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args) },
}))

const { checkRateLimit } = await import('./rateLimit')

describe('checkRateLimit', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findOneAndUpdate.mockReset()
  })

  it('allows a request inside the window and reports what is left', async () => {
    findOneAndUpdate.mockResolvedValue({ count: 3 })
    await expect(checkRateLimit('login-email', 'subject', 10, 300)).resolves.toEqual({
      allowed: true,
      remaining: 7,
    })
  })

  it('refuses once the count passes the limit', async () => {
    findOneAndUpdate.mockResolvedValue({ count: 11 })
    await expect(checkRateLimit('login-email', 'subject', 10, 300)).resolves.toEqual({
      allowed: false,
      remaining: 0,
    })
  })

  it('retries a duplicate-key race as a plain increment', async () => {
    findOneAndUpdate
      .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: 11000 }))
      .mockResolvedValueOnce({ count: 2 })

    await expect(checkRateLimit('message', 'user', 10, 10)).resolves.toEqual({
      allowed: true,
      remaining: 8,
    })
  })

  it('fails open when the write fails, rather than locking out real users', async () => {
    findOneAndUpdate.mockRejectedValue(new Error('write concern failed'))
    await expect(checkRateLimit('message', 'user', 10, 10)).resolves.toEqual({
      allowed: true,
      remaining: 1,
    })
  })

  it('fails open when the database cannot be reached at all', async () => {
    // Connecting used to happen outside the guard, so an unreachable database
    // threw out of here and turned every rate-limited endpoint into a 500 —
    // the opposite of the documented intent, and worst of all on the endpoint
    // that exists to record failures.
    connectDB.mockRejectedValue(new Error('querySrv ECONNREFUSED'))

    await expect(checkRateLimit('client-error', 'hashed-ip', 30, 300)).resolves.toEqual({
      allowed: true,
      remaining: 1,
    })
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })
})
