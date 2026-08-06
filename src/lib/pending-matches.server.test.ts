import { describe, it, expect, vi, beforeEach } from 'vitest'

const connectDB = vi.fn()
const availabilityFind = vi.fn()
const availabilityUpdateMany = vi.fn()
const conversationFindById = vi.fn()
const userFindById = vi.fn()
const reportServerError = vi.fn()

vi.mock('./db', () => ({ connectDB: () => connectDB() }))
vi.mock('./models/MatchAvailability', () => ({
  default: {
    find: (...args: unknown[]) => availabilityFind(...args),
    updateMany: (...args: unknown[]) => availabilityUpdateMany(...args),
  },
}))
vi.mock('./models/Conversation', () => ({
  default: { findById: (...args: unknown[]) => conversationFindById(...args) },
}))
vi.mock('./models/User', () => ({
  default: { findById: (...args: unknown[]) => userFindById(...args) },
}))
vi.mock('./observability/report.server', () => ({
  reportServerError: (...args: unknown[]) => reportServerError(...args),
}))

const { getPendingMatches } = await import('./pending-matches.server')

function sortable<T>(rows: T) {
  return { sort: () => ({ lean: () => Promise.resolve(rows) }) }
}
function selectable<T>(value: T) {
  return { select: () => ({ lean: () => Promise.resolve(value) }) }
}
function leanOnly<T>(value: T) {
  return { lean: () => Promise.resolve(value) }
}

describe('getPendingMatches', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    availabilityFind.mockReset()
    availabilityUpdateMany.mockReset().mockResolvedValue(undefined)
    conversationFindById.mockReset()
    userFindById.mockReset()
    reportServerError.mockReset()
  })

  it('returns nothing and touches no other collection when there are no unseen matches', async () => {
    availabilityFind.mockReturnValue(sortable([]))
    const result = await getPendingMatches('user-1')
    expect(result).toEqual([])
    expect(availabilityUpdateMany).not.toHaveBeenCalled()
    expect(conversationFindById).not.toHaveBeenCalled()
  })

  it('marks matched rows seen and returns the partner for each', async () => {
    availabilityFind.mockReturnValue(
      sortable([{ _id: 'row-1', conversationId: 'conv-1', targetLanguage: 'es' }]),
    )
    conversationFindById.mockReturnValue(
      leanOnly({ participants: ['user-1', 'partner-1'], compatibilityPct: 82 }),
    )
    userFindById.mockReturnValue(
      selectable({ _id: 'partner-1', displayName: 'Alex Rivera', username: 'alexrivera' }),
    )

    const result = await getPendingMatches('user-1')

    expect(availabilityUpdateMany).toHaveBeenCalledWith(
      { _id: { $in: ['row-1'] } },
      { $set: { seen: true } },
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ conversationId: 'conv-1', compatibilityPct: 82 })
    expect(result[0].partner.name).toBe('Alex Rivera')
  })

  it('carries the conversation type through, defaulting to chat when absent', async () => {
    availabilityFind.mockReturnValue(
      sortable([
        { _id: 'row-1', conversationId: 'conv-voice', targetLanguage: 'es' },
        { _id: 'row-2', conversationId: 'conv-chat', targetLanguage: 'es' },
      ]),
    )
    conversationFindById.mockImplementation((id: string) => {
      if (id === 'conv-voice') {
        return leanOnly({ participants: ['user-1', 'partner-1'], compatibilityPct: 90, type: 'voice' })
      }
      return leanOnly({ participants: ['user-1', 'partner-2'], compatibilityPct: 80 })
    })
    userFindById.mockReturnValue(selectable({ _id: 'partner-1', displayName: 'Alex Rivera' }))

    const result = await getPendingMatches('user-1')

    expect(result).toHaveLength(2)
    expect(result.find((r) => r.conversationId === 'conv-voice')?.type).toBe('voice')
    expect(result.find((r) => r.conversationId === 'conv-chat')?.type).toBe('chat')
  })

  it('skips a row whose conversation no longer exists rather than throwing', async () => {
    availabilityFind.mockReturnValue(
      sortable([{ _id: 'row-1', conversationId: 'conv-gone', targetLanguage: 'es' }]),
    )
    conversationFindById.mockReturnValue(leanOnly(null))

    const result = await getPendingMatches('user-1')

    expect(result).toEqual([])
    expect(userFindById).not.toHaveBeenCalled()
  })

  it('fails soft — reports the error and returns an empty list rather than breaking the dashboard', async () => {
    availabilityFind.mockImplementation(() => {
      throw new Error('db down')
    })

    await expect(getPendingMatches('user-1')).resolves.toEqual([])
    expect(reportServerError).toHaveBeenCalledWith(
      'pendingMatches.getPendingMatches',
      expect.any(Error),
      expect.objectContaining({ context: { userId: 'user-1' } }),
    )
  })
})
