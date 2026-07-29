import { describe, it, expect, vi, beforeEach } from 'vitest'

const connectDB = vi.fn()
const findOne = vi.fn()
const findById = vi.fn()
const find = vi.fn()
const findByIdAndUpdate = vi.fn()

vi.mock('./db', () => ({ connectDB: () => connectDB() }))
vi.mock('./models/User', () => ({
  default: {
    findOne: (...args: unknown[]) => findOne(...args),
    findById: (...args: unknown[]) => findById(...args),
    find: (...args: unknown[]) => find(...args),
    findByIdAndUpdate: (...args: unknown[]) => findByIdAndUpdate(...args),
  },
}))

const { isBlockedEitherWay, getBlockedUserIds, blockUser, unblockUser } = await import(
  './blocking.server'
)

function lean<T>(value: T) {
  return { select: () => ({ lean: () => Promise.resolve(value) }) }
}

describe('isBlockedEitherWay', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findOne.mockReset()
  })

  it('is true when either user blocked the other', async () => {
    findOne.mockReturnValue(lean({ _id: 'a' }))
    await expect(isBlockedEitherWay('a', 'b')).resolves.toBe(true)
  })

  it('is false when neither has blocked the other', async () => {
    findOne.mockReturnValue(lean(null))
    await expect(isBlockedEitherWay('a', 'b')).resolves.toBe(false)
  })
})

describe('getBlockedUserIds', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findById.mockReset()
    find.mockReset()
  })

  it('unions who I blocked with who blocked me, deduplicated', async () => {
    findById.mockReturnValue(
      lean({ blockedUsers: [{ toString: () => 'x' }, { toString: () => 'y' }] })
    )
    find.mockReturnValue(lean([{ _id: { toString: () => 'y' } }, { _id: { toString: () => 'z' } }]))

    const ids = await getBlockedUserIds('me')
    expect(new Set(ids)).toEqual(new Set(['x', 'y', 'z']))
    expect(ids).toHaveLength(3)
  })

  it('returns an empty list when nobody is blocked in either direction', async () => {
    findById.mockReturnValue(lean({ blockedUsers: [] }))
    find.mockReturnValue(lean([]))
    await expect(getBlockedUserIds('me')).resolves.toEqual([])
  })

  it('tolerates a missing user document', async () => {
    findById.mockReturnValue(lean(null))
    find.mockReturnValue(lean([]))
    await expect(getBlockedUserIds('me')).resolves.toEqual([])
  })
})

describe('blockUser', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findByIdAndUpdate.mockReset().mockResolvedValue(null)
  })

  it('adds the target to my blockedUsers and clears the friendship both ways', async () => {
    await blockUser('me', 'them')

    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'me',
      expect.objectContaining({
        $addToSet: { blockedUsers: 'them' },
        $pull: { friends: 'them', friendRequests: { from: 'them' } },
      })
    )
    expect(findByIdAndUpdate).toHaveBeenCalledWith(
      'them',
      expect.objectContaining({
        $pull: { friends: 'me', friendRequests: { from: 'me' } },
      })
    )
  })
})

describe('unblockUser', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findByIdAndUpdate.mockReset().mockResolvedValue(null)
  })

  it('only removes the blocker-side entry, not the friendship pull', async () => {
    await unblockUser('me', 'them')
    expect(findByIdAndUpdate).toHaveBeenCalledTimes(1)
    expect(findByIdAndUpdate).toHaveBeenCalledWith('me', { $pull: { blockedUsers: 'them' } })
  })
})
