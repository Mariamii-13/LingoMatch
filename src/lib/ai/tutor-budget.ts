import 'server-only'
import { checkRateLimit } from '@/lib/rateLimit'

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

export type TutorBudgetCode =
  | 'BURST_LIMIT_REACHED'
  | 'DAILY_LIMIT_REACHED'
  | 'DAILY_BUDGET_REACHED'

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

  return { allowed: true }
}
