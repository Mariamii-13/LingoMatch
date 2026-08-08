import { describe, it, expect, vi, beforeEach } from 'vitest'

const connectDB = vi.fn()
const findOne = vi.fn()
const sendPasswordResetEmail = vi.fn()
const bcryptHash = vi.fn()

vi.mock('./db', () => ({ connectDB: () => connectDB() }))
vi.mock('./models/User', () => ({ default: { findOne: (...args: unknown[]) => findOne(...args) } }))
vi.mock('./mail', () => ({ sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmail(...args) }))
vi.mock('bcryptjs', () => ({ default: { hash: (...args: unknown[]) => bcryptHash(...args) } }))

const { requestPasswordReset, performPasswordReset, hashResetToken, RESET_TOKEN_TTL_MS } =
  await import('./password-reset.server')

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    email: 'user@example.com',
    resetTokenHash: null as string | null,
    resetTokenExpiresAt: null as Date | null,
    passwordHash: 'old-hash',
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

beforeEach(() => {
  connectDB.mockReset().mockResolvedValue(undefined)
  findOne.mockReset()
  sendPasswordResetEmail.mockReset().mockResolvedValue(undefined)
  bcryptHash.mockReset().mockResolvedValue('new-hash')
  process.env.AUTH_URL = 'https://app.example.com'
})

describe('hashResetToken', () => {
  it('is deterministic', () => {
    expect(hashResetToken('abc')).toBe(hashResetToken('abc'))
  })

  it('differs between tokens', () => {
    expect(hashResetToken('abc')).not.toBe(hashResetToken('xyz'))
  })

  it('never returns the raw token', () => {
    expect(hashResetToken('abc')).not.toBe('abc')
  })
})

describe('requestPasswordReset', () => {
  it('does nothing when no account matches the email', async () => {
    findOne.mockResolvedValue(null)
    await requestPasswordReset('nobody@example.com')
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('generates a token, saves its hash and expiry, and emails a link containing the raw token', async () => {
    const user = fakeUser()
    findOne.mockResolvedValue(user)

    await requestPasswordReset('user@example.com')

    expect(user.save).toHaveBeenCalled()
    expect(user.resetTokenHash).toBeTruthy()
    expect(user.resetTokenExpiresAt).toBeInstanceOf(Date)
    expect(user.resetTokenExpiresAt!.getTime()).toBeGreaterThan(Date.now())
    expect(user.resetTokenExpiresAt!.getTime()).toBeLessThanOrEqual(Date.now() + RESET_TOKEN_TTL_MS + 1000)

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1)
    const [to, resetUrl] = sendPasswordResetEmail.mock.calls[0] as [string, string]
    expect(to).toBe('user@example.com')
    expect(resetUrl).toMatch(/^https:\/\/app\.example\.com\/reset-password\?token=[0-9a-f]{64}$/)

    // The stored hash must correspond to the raw token in the emailed link.
    const rawToken = new URL(resetUrl).searchParams.get('token')!
    expect(user.resetTokenHash).toBe(hashResetToken(rawToken))
  })

  it('lets an email-send failure propagate, rather than swallowing it', async () => {
    findOne.mockResolvedValue(fakeUser())
    sendPasswordResetEmail.mockRejectedValue(new Error('smtp down'))
    await expect(requestPasswordReset('user@example.com')).rejects.toThrow('smtp down')
  })
})

describe('performPasswordReset', () => {
  it('rejects when no user matches the token (wrong or expired)', async () => {
    findOne.mockResolvedValue(null)
    const result = await performPasswordReset('bad-token', 'newpassword123')
    expect(result).toEqual({ success: false, reason: 'invalid-or-expired' })
    expect(bcryptHash).not.toHaveBeenCalled()
  })

  it('hashes the new password, clears the token, and saves', async () => {
    const user = fakeUser({ resetTokenHash: hashResetToken('good-token'), resetTokenExpiresAt: new Date(Date.now() + 1000) })
    findOne.mockResolvedValue(user)

    const result = await performPasswordReset('good-token', 'newpassword123')

    expect(result).toEqual({ success: true })
    expect(bcryptHash).toHaveBeenCalledWith('newpassword123', 12)
    expect(user.passwordHash).toBe('new-hash')
    expect(user.resetTokenHash).toBeNull()
    expect(user.resetTokenExpiresAt).toBeNull()
    expect(user.save).toHaveBeenCalled()
  })

  it('queries only for a non-expired token, so Mongo itself enforces expiry', async () => {
    findOne.mockResolvedValue(null)
    await performPasswordReset('some-token', 'newpassword123')
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        resetTokenHash: hashResetToken('some-token'),
        resetTokenExpiresAt: expect.objectContaining({ $gt: expect.any(Date) }),
      }),
    )
  })
})
