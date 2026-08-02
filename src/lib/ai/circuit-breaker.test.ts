import { describe, it, expect, vi, beforeEach } from 'vitest'

const connectDB = vi.fn()
const findOneAndUpdate = vi.fn()
const findOne = vi.fn()

vi.mock('../db', () => ({ connectDB: () => connectDB() }))
vi.mock('../models/RateLimit', () => ({
  default: {
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
    findOne: (...args: unknown[]) => findOne(...args),
  },
}))

const { isCircuitOpen, recordModelFailure } = await import('./circuit-breaker')

describe('isCircuitOpen', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findOne.mockReset()
  })

  it('is closed when there is no failure record yet', async () => {
    findOne.mockReturnValue({ lean: () => Promise.resolve(null) })
    await expect(isCircuitOpen('some/model')).resolves.toBe(false)
  })

  it('is closed below the failure threshold', async () => {
    findOne.mockReturnValue({ lean: () => Promise.resolve({ count: 4 }) })
    await expect(isCircuitOpen('some/model')).resolves.toBe(false)
  })

  it('is open once the failure threshold is reached', async () => {
    findOne.mockReturnValue({ lean: () => Promise.resolve({ count: 5 }) })
    await expect(isCircuitOpen('some/model')).resolves.toBe(true)
  })

  it('fails open (reports closed) when the database is unreachable', async () => {
    connectDB.mockRejectedValue(new Error('unreachable'))
    await expect(isCircuitOpen('some/model')).resolves.toBe(false)
  })

  it('checking does not itself count as a failure — it never writes', async () => {
    findOne.mockReturnValue({ lean: () => Promise.resolve({ count: 1 }) })
    await isCircuitOpen('some/model')
    expect(findOneAndUpdate).not.toHaveBeenCalled()
  })
})

describe('recordModelFailure', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findOneAndUpdate.mockReset().mockResolvedValue({ count: 1 })
  })

  it('increments the failure count for the model', async () => {
    await recordModelFailure('some/model')
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { key: expect.stringContaining('ai-circuit:some/model:') },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: expect.any(Date) } },
      { upsert: true },
    )
  })

  it('does not throw when the database is unreachable — fails open silently', async () => {
    connectDB.mockRejectedValue(new Error('unreachable'))
    await expect(recordModelFailure('some/model')).resolves.toBeUndefined()
  })

  it('does not throw on a concurrent-upsert duplicate-key race', async () => {
    findOneAndUpdate.mockRejectedValue(Object.assign(new Error('duplicate'), { code: 11000 }))
    await expect(recordModelFailure('some/model')).resolves.toBeUndefined()
  })
})
