import { describe, it, expect, vi, beforeEach } from 'vitest'

const connectDB = vi.fn()
const findOne = vi.fn()
const findByIdAndUpdate = vi.fn()
const reportServerError = vi.fn()

vi.mock('./db', () => ({ connectDB: () => connectDB() }))
vi.mock('./models/User', () => ({
  default: {
    findOne: (...args: unknown[]) => findOne(...args),
    findByIdAndUpdate: (...args: unknown[]) => findByIdAndUpdate(...args),
  },
}))
vi.mock('./observability/report.server', () => ({
  reportServerError: (...args: unknown[]) => reportServerError(...args),
}))

const { applyReferral } = await import('./referral.server')

function lean<T>(value: T) {
  return { select: () => ({ lean: () => Promise.resolve(value) }) }
}

describe('applyReferral', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findOne.mockReset()
    findByIdAndUpdate.mockReset().mockResolvedValue(undefined)
    reportServerError.mockReset()
  })

  it('does nothing when no ref code is given', async () => {
    const result = await applyReferral('new-user-1', undefined)
    expect(result).toEqual({ applied: false })
    expect(connectDB).not.toHaveBeenCalled()
  })

  it('does nothing when the ref username does not resolve to a real account', async () => {
    findOne.mockReturnValue(lean(null))
    const result = await applyReferral('new-user-1', 'nobody')
    expect(result).toEqual({ applied: false })
    expect(findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it('connects the new user and the inviter as mutual friends, and records attribution', async () => {
    findOne.mockReturnValue(lean({ _id: 'inviter-1', username: 'alexrivera' }))

    const result = await applyReferral('new-user-1', 'AlexRivera')

    expect(result).toEqual({ applied: true, inviterUsername: 'alexrivera' })
    expect(findByIdAndUpdate).toHaveBeenCalledWith('new-user-1', {
      $set: { invitedBy: 'inviter-1' },
      $addToSet: { friends: 'inviter-1' },
    })
    expect(findByIdAndUpdate).toHaveBeenCalledWith('inviter-1', {
      $addToSet: { friends: 'new-user-1' },
    })
  })

  it('refuses a self-referral without touching the database mutation', async () => {
    findOne.mockReturnValue(lean({ _id: 'new-user-1', username: 'me' }))
    const result = await applyReferral('new-user-1', 'me')
    expect(result).toEqual({ applied: false })
    expect(findByIdAndUpdate).not.toHaveBeenCalled()
  })

  it('fails soft — reports the error rather than throwing, so a bad ref never blocks registration', async () => {
    findOne.mockImplementation(() => {
      throw new Error('db down')
    })

    await expect(applyReferral('new-user-1', 'alexrivera')).resolves.toEqual({ applied: false })
    expect(reportServerError).toHaveBeenCalledWith(
      'referral.applyReferral',
      expect.any(Error),
      expect.objectContaining({ context: { refUsername: 'alexrivera' } }),
    )
  })
})
