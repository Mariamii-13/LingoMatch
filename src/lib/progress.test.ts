import { describe, it, expect } from 'vitest'

/*
 * The streak rule is the only real logic on the progress page, and it is easy to
 * get subtly wrong, so it is exercised directly. Kept as a local copy of the
 * rule rather than reaching into the server module, which imports mongoose.
 */
const STREAK_LOOKBACK_DAYS = 30

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function computeStreak(days: Set<string>, today: Date): number {
  if (days.size === 0) return 0

  const cursor = new Date(today)
  if (!days.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    if (!days.has(dayKey(cursor))) return 0
  }

  let streak = 0
  while (days.has(dayKey(cursor)) && streak < STREAK_LOOKBACK_DAYS) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

const TODAY = new Date('2026-07-29T12:00:00.000Z')

function daysBefore(count: number): string {
  const d = new Date(TODAY)
  d.setUTCDate(d.getUTCDate() - count)
  return dayKey(d)
}

describe('practice streak', () => {
  it('is zero with no practice', () => {
    expect(computeStreak(new Set(), TODAY)).toBe(0)
  })

  it('counts a single day practised today', () => {
    expect(computeStreak(new Set([daysBefore(0)]), TODAY)).toBe(1)
  })

  // A streak should not read as broken just because the user has not practised
  // yet on the day they happen to open the page.
  it('still counts when the most recent day was yesterday', () => {
    expect(computeStreak(new Set([daysBefore(1), daysBefore(2)]), TODAY)).toBe(2)
  })

  it('counts consecutive days ending today', () => {
    const days = new Set([daysBefore(0), daysBefore(1), daysBefore(2), daysBefore(3)])
    expect(computeStreak(days, TODAY)).toBe(4)
  })

  it('stops at the first missing day', () => {
    // Practised today and yesterday, then a gap, then more.
    const days = new Set([daysBefore(0), daysBefore(1), daysBefore(4), daysBefore(5)])
    expect(computeStreak(days, TODAY)).toBe(2)
  })

  it('is zero when the last practice is older than yesterday', () => {
    expect(computeStreak(new Set([daysBefore(3), daysBefore(4)]), TODAY)).toBe(0)
  })

  it('does not run away on a long unbroken history', () => {
    const days = new Set(Array.from({ length: 100 }, (_, i) => daysBefore(i)))
    expect(computeStreak(days, TODAY)).toBe(STREAK_LOOKBACK_DAYS)
  })

  it('ignores duplicate entries for the same day', () => {
    // Several turns on one day must count once.
    const days = new Set([daysBefore(0), daysBefore(0), daysBefore(1)])
    expect(computeStreak(days, TODAY)).toBe(2)
  })
})
