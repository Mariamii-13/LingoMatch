import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const checkRateLimit = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rateLimit', () => ({ checkRateLimit }))

import {
  BURST_LIMIT,
  DAY_SECS,
  BURST_WINDOW_SECS,
  DEFAULT_GLOBAL_DAILY_BUDGET,
  USER_DAILY_LIMIT,
  checkTutorBudget,
  resolveGlobalDailyBudget,
} from './tutor-budget'

/** Allows every check except the named action. */
function denyOnly(action: string) {
  checkRateLimit.mockImplementation(async (name: string) => ({
    allowed: name !== action,
    remaining: name === action ? 0 : 5,
  }))
}

function allowAll() {
  checkRateLimit.mockResolvedValue({ allowed: true, remaining: 5 })
}

function actionsCalled(): string[] {
  return checkRateLimit.mock.calls.map((call) => call[0] as string)
}

beforeEach(() => {
  checkRateLimit.mockReset()
})

afterEach(() => {
  delete process.env.AI_DAILY_REQUEST_BUDGET
})

describe('resolveGlobalDailyBudget', () => {
  it('defaults when unset', () => {
    expect(resolveGlobalDailyBudget()).toBe(DEFAULT_GLOBAL_DAILY_BUDGET)
  })

  it('honours a valid override', () => {
    process.env.AI_DAILY_REQUEST_BUDGET = '1200'
    expect(resolveGlobalDailyBudget()).toBe(1200)
  })

  it('falls back to the default for non-numeric values', () => {
    process.env.AI_DAILY_REQUEST_BUDGET = 'plenty'
    expect(resolveGlobalDailyBudget()).toBe(DEFAULT_GLOBAL_DAILY_BUDGET)
  })

  it('falls back to the default for zero and negatives', () => {
    process.env.AI_DAILY_REQUEST_BUDGET = '0'
    expect(resolveGlobalDailyBudget()).toBe(DEFAULT_GLOBAL_DAILY_BUDGET)
    process.env.AI_DAILY_REQUEST_BUDGET = '-5'
    expect(resolveGlobalDailyBudget()).toBe(DEFAULT_GLOBAL_DAILY_BUDGET)
  })
})

describe('checkTutorBudget', () => {
  it('allows a request within every limit', async () => {
    allowAll()
    await expect(checkTutorBudget('user-1')).resolves.toEqual({ allowed: true })
  })

  it('applies the documented limits and windows', async () => {
    allowAll()
    await checkTutorBudget('user-1')

    expect(checkRateLimit).toHaveBeenCalledWith(
      'ai-tutor-burst',
      'user-1',
      BURST_LIMIT,
      BURST_WINDOW_SECS,
    )
    expect(checkRateLimit).toHaveBeenCalledWith(
      'ai-tutor-day',
      'user-1',
      USER_DAILY_LIMIT,
      DAY_SECS,
    )
    expect(checkRateLimit).toHaveBeenCalledWith(
      'ai-tutor-global',
      'all-users',
      DEFAULT_GLOBAL_DAILY_BUDGET,
      DAY_SECS,
    )
  })

  it('blocks a burst as retryable', async () => {
    denyOnly('ai-tutor-burst')
    await expect(checkTutorBudget('user-1')).resolves.toMatchObject({
      allowed: false,
      code: 'BURST_LIMIT_REACHED',
      retryable: true,
    })
  })

  it('blocks a spent personal daily allowance as non-retryable', async () => {
    denyOnly('ai-tutor-day')
    await expect(checkTutorBudget('user-1')).resolves.toMatchObject({
      allowed: false,
      code: 'DAILY_LIMIT_REACHED',
      retryable: false,
    })
  })

  it('blocks a spent shared budget as non-retryable', async () => {
    denyOnly('ai-tutor-global')
    await expect(checkTutorBudget('user-1')).resolves.toMatchObject({
      allowed: false,
      code: 'DAILY_BUDGET_REACHED',
      retryable: false,
    })
  })

  it('does not touch the shared budget when the burst limit rejects', async () => {
    denyOnly('ai-tutor-burst')
    await checkTutorBudget('user-1')
    // Otherwise one abusive client could drain everyone's daily budget.
    expect(actionsCalled()).toEqual(['ai-tutor-burst'])
  })

  it('does not touch the shared budget when the personal daily limit rejects', async () => {
    denyOnly('ai-tutor-day')
    await checkTutorBudget('user-1')
    expect(actionsCalled()).toEqual(['ai-tutor-burst', 'ai-tutor-day'])
  })

  it('consults the shared budget only after both personal checks pass', async () => {
    allowAll()
    await checkTutorBudget('user-1')
    expect(actionsCalled()).toEqual(['ai-tutor-burst', 'ai-tutor-day', 'ai-tutor-global'])
  })

  it('scopes personal limits per user but shares the global budget', async () => {
    allowAll()
    await checkTutorBudget('user-1')
    await checkTutorBudget('user-2')

    const subjects = checkRateLimit.mock.calls.map((call) => [call[0], call[1]])
    expect(subjects).toContainEqual(['ai-tutor-burst', 'user-1'])
    expect(subjects).toContainEqual(['ai-tutor-burst', 'user-2'])
    expect(subjects.filter(([action]) => action === 'ai-tutor-global')).toEqual([
      ['ai-tutor-global', 'all-users'],
      ['ai-tutor-global', 'all-users'],
    ])
  })

  it('honours a raised shared budget from the environment', async () => {
    process.env.AI_DAILY_REQUEST_BUDGET = '2000'
    allowAll()
    await checkTutorBudget('user-1')
    expect(checkRateLimit).toHaveBeenCalledWith('ai-tutor-global', 'all-users', 2000, DAY_SECS)
  })
})
