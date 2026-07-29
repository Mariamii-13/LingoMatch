import { describe, it, expect, vi, beforeEach } from 'vitest'

const connectDB = vi.fn()
const findById = vi.fn()
const create = vi.fn()
const reportServerError = vi.fn()

vi.mock('./db', () => ({ connectDB: () => connectDB() }))
vi.mock('./models/User', () => ({
  default: { findById: (...args: unknown[]) => findById(...args) },
}))
vi.mock('./models/ModerationAction', () => ({
  default: { create: (...args: unknown[]) => create(...args) },
}))
vi.mock('./observability/report.server', () => ({
  reportServerError: (...args: unknown[]) => reportServerError(...args),
}))

const { recordModerationAction } = await import('./moderation.server')

function lean<T>(value: T) {
  return { select: () => ({ lean: () => Promise.resolve(value) }) }
}

describe('recordModerationAction', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findById.mockReset()
    create.mockReset().mockResolvedValue(undefined)
    reportServerError.mockReset()
  })

  it('resolves actor and target usernames and writes one row', async () => {
    findById.mockImplementation((id: string) =>
      lean(id === 'actor-1' ? { username: 'moderator' } : { username: 'baduser' })
    )

    await recordModerationAction({
      actorId: 'actor-1',
      action: 'ban',
      targetUserId: 'target-1',
      reason: 'Harassment',
    })

    expect(create).toHaveBeenCalledWith({
      actorId: 'actor-1',
      actorUsername: 'moderator',
      action: 'ban',
      targetUserId: 'target-1',
      targetUsername: 'baduser',
      reason: 'Harassment',
      reportId: null,
    })
  })

  it('falls back to "unknown" when a user lookup comes back empty', async () => {
    findById.mockReturnValue(lean(null))

    await recordModerationAction({ actorId: 'a', action: 'unban', targetUserId: 't' })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ actorUsername: 'unknown', targetUsername: 'unknown' })
    )
  })

  it('reports the failure instead of throwing, so a logging failure never undoes the action', async () => {
    findById.mockReturnValue(lean({ username: 'x' }))
    create.mockRejectedValue(new Error('write failed'))

    await expect(
      recordModerationAction({ actorId: 'a', action: 'ban', targetUserId: 't' })
    ).resolves.toBeUndefined()

    expect(reportServerError).toHaveBeenCalledWith(
      'moderation.recordModerationAction',
      expect.any(Error),
      expect.objectContaining({ context: { action: 'ban', targetUserId: 't' } })
    )
  })
})
