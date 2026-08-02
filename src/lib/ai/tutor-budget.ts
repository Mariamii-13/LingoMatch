import 'server-only'
import { checkRateLimit, incrementUsage, peekUsage } from '@/lib/rateLimit'

/**
 * Request limits for the AI tutor.
 *
 * The tutor is the only endpoint that costs money, and the provider's free-tier
 * quota is billed to the account rather than to each user. One runaway client
 * can therefore take the tutor offline for everybody, which is why a per-user
 * limit alone is not enough — see GLOBAL_DAILY_BUDGET.
 */
export const BURST_LIMIT = 15
export const BURST_WINDOW_SECS = 60

export const USER_DAILY_LIMIT = 80
export const DAY_SECS = 86_400

/**
 * Shared ceiling across all users, set just below the provider's own cap.
 *
 * OpenRouter's free tier allows 50 model requests per day for the whole
 * account (`X-RateLimit-Limit: 50`, `limit_source: openrouter_free_tier_daily`).
 * Staying under it means users meet our own clear "try again tomorrow" message
 * instead of an opaque upstream 429 after three failed model attempts.
 *
 * Raise this via AI_DAILY_REQUEST_BUDGET only after raising the provider quota,
 * or the extra allowance will simply fail upstream.
 */
export const DEFAULT_GLOBAL_DAILY_BUDGET = 45

/**
 * Roadmap #30 (§19.6.3): request count stops being the right unit for
 * spend control once a paid model is live — a long session costs far more
 * than a fresh one at the same request count. This is a real dollar
 * ceiling on top of (not instead of) the request-count budget above, using
 * the actual `usage.cost` OpenRouter reports per call (see `recordTutorCost`
 * and openrouter.ts). $3/day is a deliberately generous circuit breaker, not
 * a tuned limit: §20.5 measured real paid-chain cost at ≈$0.0026/message, so
 * even the full 45-request daily budget on the paid model would only reach
 * ≈$0.12/day — this exists to catch something going structurally wrong
 * (e.g. a routing bug sending free-tier traffic through the paid chain),
 * not to be the primary cost control.
 */
export const DEFAULT_GLOBAL_DAILY_COST_BUDGET_USD = 3

const COST_MICRO_USD_PER_USD = 1_000_000

export type TutorBudgetCode =
  | 'BURST_LIMIT_REACHED'
  | 'DAILY_LIMIT_REACHED'
  | 'DAILY_BUDGET_REACHED'
  | 'DAILY_COST_BUDGET_REACHED'

export type TutorBudgetResult =
  | { allowed: true }
  | { allowed: false; code: TutorBudgetCode; message: string; retryable: boolean }

export function resolveGlobalDailyBudget(): number {
  const raw = process.env.AI_DAILY_REQUEST_BUDGET
  if (!raw) return DEFAULT_GLOBAL_DAILY_BUDGET
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_GLOBAL_DAILY_BUDGET
  return parsed
}

export function resolveGlobalDailyCostBudgetUsd(): number {
  const raw = process.env.AI_DAILY_COST_BUDGET_USD
  if (!raw) return DEFAULT_GLOBAL_DAILY_COST_BUDGET_USD
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_GLOBAL_DAILY_COST_BUDGET_USD
  return parsed
}

/**
 * Records a completed call's real cost against the shared daily total.
 * Stored as integer micro-USD (cost × 1,000,000) — `RateLimitModel.count`
 * is incremented with Mongo's `$inc`, which is exact for integers but would
 * silently accumulate floating-point drift over thousands of calls if the
 * raw dollar float were stored instead.
 *
 * Called only with a real, observed cost (openrouter.ts already omits
 * `costUsd` rather than guessing when the gateway doesn't report it — see
 * `ModelMetric`), so this must never be called speculatively or with an
 * estimate.
 */
export async function recordTutorCost(costUsd: number): Promise<void> {
  const microUsd = Math.round(costUsd * COST_MICRO_USD_PER_USD)
  if (microUsd <= 0) return
  await incrementUsage('ai-tutor-global-cost', 'all-users', DAY_SECS, microUsd)
}

/**
 * Decides whether a tutor request may proceed.
 *
 * The order of the three checks is load-bearing. Every check increments its own
 * counter, so the shared budget is consulted LAST — only once the caller has
 * cleared their personal limits. Checking it earlier would let rejected spam
 * inflate the global counter, and a single abusive client could exhaust the
 * budget for everyone: precisely what the budget is meant to prevent.
 */
export async function checkTutorBudget(userId: string): Promise<TutorBudgetResult> {
  const burst = await checkRateLimit('ai-tutor-burst', userId, BURST_LIMIT, BURST_WINDOW_SECS)
  if (!burst.allowed) {
    return {
      allowed: false,
      code: 'BURST_LIMIT_REACHED',
      message: 'You are sending messages very quickly. Please wait a moment and try again.',
      retryable: true,
    }
  }

  const daily = await checkRateLimit('ai-tutor-day', userId, USER_DAILY_LIMIT, DAY_SECS)
  if (!daily.allowed) {
    return {
      allowed: false,
      code: 'DAILY_LIMIT_REACHED',
      message: `You have reached your ${USER_DAILY_LIMIT} tutor messages for today. Your practice resets tomorrow.`,
      retryable: false,
    }
  }

  const global = await checkRateLimit(
    'ai-tutor-global',
    'all-users',
    resolveGlobalDailyBudget(),
    DAY_SECS,
  )
  if (!global.allowed) {
    return {
      allowed: false,
      code: 'DAILY_BUDGET_REACHED',
      message:
        'The AI tutor has reached its shared daily limit for the preview. Please try again tomorrow.',
      retryable: false,
    }
  }

  // Last, and a peek rather than a check-and-increment: cost is only ever
  // recorded after a real call completes (recordTutorCost), so there is
  // nothing here for a rejected request to inflate — unlike the request
  // counters above, this check cannot itself be gamed by retrying.
  const spentMicroUsd = await peekUsage('ai-tutor-global-cost', 'all-users', DAY_SECS)
  const budgetMicroUsd = resolveGlobalDailyCostBudgetUsd() * COST_MICRO_USD_PER_USD
  if (spentMicroUsd >= budgetMicroUsd) {
    return {
      allowed: false,
      code: 'DAILY_COST_BUDGET_REACHED',
      message:
        'The AI tutor has reached its shared daily spending limit for the preview. Please try again tomorrow.',
      retryable: false,
    }
  }

  return { allowed: true }
}
