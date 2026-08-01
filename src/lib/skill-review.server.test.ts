import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextIntervalDays } from './skill-review.server'

describe('nextIntervalDays (Leitner progression, pure)', () => {
  it('resets to the shortest interval on a forgotten review, regardless of current interval', () => {
    expect(nextIntervalDays(1, false)).toBe(1)
    expect(nextIntervalDays(7, false)).toBe(1)
    expect(nextIntervalDays(21, false)).toBe(1)
  })

  it('advances through the full progression on consecutive remembered reviews', () => {
    let interval = 1
    const seen: number[] = [interval]
    for (let i = 0; i < 5; i++) {
      interval = nextIntervalDays(interval, true)
      seen.push(interval)
    }
    expect(seen).toEqual([1, 3, 7, 21, 21, 21])
  })

  it('caps at the longest interval rather than growing without bound', () => {
    expect(nextIntervalDays(21, true)).toBe(21)
  })

  it('treats an unrecognised current interval defensively, still advancing rather than throwing', () => {
    expect(nextIntervalDays(999, true)).toBe(3)
    expect(nextIntervalDays(999, false)).toBe(1)
  })
})

const connectDB = vi.fn()
const findOne = vi.fn()
const create = vi.fn()
const countDocuments = vi.fn()
const find = vi.fn()
const reportServerError = vi.fn()

vi.mock('@/lib/db', () => ({ connectDB: () => connectDB() }))
vi.mock('@/lib/models/SkillReview', () => ({
  default: {
    findOne: (...args: unknown[]) => findOne(...args),
    create: (...args: unknown[]) => create(...args),
    countDocuments: (...args: unknown[]) => countDocuments(...args),
    find: (...args: unknown[]) => find(...args),
  },
}))
vi.mock('@/lib/observability/report.server', () => ({
  reportServerError: (...args: unknown[]) => reportServerError(...args),
}))

const { recordCorrection, getDueReviews, countDueReviews, recordReviewOutcome } = await import(
  './skill-review.server'
)

describe('recordCorrection', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findOne.mockReset()
    create.mockReset().mockResolvedValue(undefined)
    reportServerError.mockReset()
  })

  it('creates a new schedule, due tomorrow, the first time a skill is seen', async () => {
    findOne.mockResolvedValue(null)
    const before = Date.now()

    await recordCorrection({
      userId: 'user-1',
      targetLanguageCode: 'es',
      skillTag: 'preterite-vs-present',
      exampleCorrection: 'Ayer fui al mercado.',
    })

    expect(create).toHaveBeenCalledTimes(1)
    const arg = create.mock.calls[0][0]
    expect(arg).toMatchObject({
      userId: 'user-1',
      targetLanguageCode: 'es',
      skillTag: 'preterite-vs-present',
      exampleCorrection: 'Ayer fui al mercado.',
      intervalDays: 1,
    })
    const dueAt = (arg.dueAt as Date).getTime()
    expect(dueAt).toBeGreaterThan(before)
    expect(dueAt).toBeLessThanOrEqual(before + 25 * 60 * 60 * 1000)
  })

  it('refreshes the example but does not reset an existing schedule when the skill recurs', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    findOne.mockResolvedValue({ exampleCorrection: 'old example', intervalDays: 7, save })

    await recordCorrection({
      userId: 'user-1',
      targetLanguageCode: 'es',
      skillTag: 'preterite-vs-present',
      exampleCorrection: 'new example',
    })

    expect(create).not.toHaveBeenCalled()
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('fails soft: a write error is reported, not thrown, so a correction failure never breaks the tutor reply', async () => {
    findOne.mockRejectedValue(new Error('db down'))

    await expect(
      recordCorrection({
        userId: 'user-1',
        targetLanguageCode: 'es',
        skillTag: 'preterite-vs-present',
        exampleCorrection: 'Ayer fui al mercado.',
      }),
    ).resolves.toBeUndefined()

    expect(reportServerError).toHaveBeenCalledWith(
      'skill-review.recordCorrection',
      expect.any(Error),
      expect.objectContaining({ context: { targetLanguageCode: 'es', skillTag: 'preterite-vs-present' } }),
    )
  })
})

describe('getDueReviews', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    find.mockReset()
  })

  it('maps documents to the DueReview shape, id stringified', async () => {
    const dueAt = new Date('2026-08-02T00:00:00.000Z')
    const lean = vi.fn().mockResolvedValue([
      { _id: 'abc123', skillTag: 'ser-vs-estar', targetLanguageCode: 'es', exampleCorrection: 'Soy feliz.', dueAt },
    ])
    const limit = vi.fn().mockReturnValue({ lean })
    const sort = vi.fn().mockReturnValue({ limit })
    find.mockReturnValue({ sort })

    const result = await getDueReviews('user-1')

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', dueAt: expect.objectContaining({ $lte: expect.any(Date) }) }),
    )
    expect(result).toEqual([
      { id: 'abc123', skillTag: 'ser-vs-estar', targetLanguageCode: 'es', exampleCorrection: 'Soy feliz.', dueAt },
    ])
  })
})

describe('countDueReviews', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    countDocuments.mockReset()
    reportServerError.mockReset()
  })

  it('returns the real count', async () => {
    countDocuments.mockResolvedValue(4)
    expect(await countDueReviews('user-1')).toBe(4)
  })

  it('fails soft to 0 rather than failing a page render over a badge count', async () => {
    countDocuments.mockRejectedValue(new Error('db down'))
    expect(await countDueReviews('user-1')).toBe(0)
    expect(reportServerError).toHaveBeenCalled()
  })
})

describe('recordReviewOutcome', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    findOne.mockReset()
  })

  it('advances the interval and reschedules on a remembered review', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const doc = { intervalDays: 1, dueAt: new Date(0), lastReviewedAt: null, reviewCount: 0, save }
    findOne.mockResolvedValue(doc)

    const ok = await recordReviewOutcome({ userId: 'user-1', reviewId: 'rev-1', remembered: true })

    expect(ok).toBe(true)
    expect(doc.intervalDays).toBe(3)
    expect(doc.reviewCount).toBe(1)
    expect(doc.lastReviewedAt).toBeInstanceOf(Date)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('resets the interval on a forgotten review', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const doc = { intervalDays: 21, dueAt: new Date(0), lastReviewedAt: null, reviewCount: 5, save }
    findOne.mockResolvedValue(doc)

    await recordReviewOutcome({ userId: 'user-1', reviewId: 'rev-1', remembered: false })

    expect(doc.intervalDays).toBe(1)
  })

  it('scopes the lookup by userId, so one user cannot reschedule another\'s review', async () => {
    findOne.mockResolvedValue(null)

    const ok = await recordReviewOutcome({ userId: 'attacker', reviewId: 'rev-1', remembered: true })

    expect(ok).toBe(false)
    expect(findOne).toHaveBeenCalledWith({ _id: 'rev-1', userId: 'attacker' })
  })
})
