import 'server-only'
import { connectDB } from '../db'
import RateLimitModel from '../models/RateLimit'

/**
 * Roadmap #34 (passport §21.4 Phase 1, remaining piece). Built on
 * infrastructure this project already has, not a new dependency: the
 * existing MongoDB fixed-window counter (`rateLimit.ts`, 3.21) already does
 * exactly the counting a circuit breaker needs — atomic
 * `findOneAndUpdate`+`$inc`, TTL cleanup, fail-open on a database problem.
 * This reuses the same `RateLimitModel` and key-per-window shape under a
 * separate key namespace (`ai-circuit:`) rather than importing
 * `checkRateLimit` itself, because a breaker needs a read that does not
 * itself count as an attempt (`isCircuitOpen`) alongside the write that does
 * (`recordModelFailure`) — two different operations `checkRateLimit`'s
 * single always-increments call doesn't separate.
 *
 * A model that fails FAILURE_THRESHOLD times inside one FAILURE_WINDOW_SECS
 * window has its circuit considered open for the rest of that window; the
 * chain-walking loops in `openrouter.ts` skip it and move to the next model
 * without spending a request (and the ~25s timeout budget) on a model
 * already known to be down. The circuit closes itself when the fixed window
 * rolls over — no separate "reset" mechanism needed, same as the rate
 * limiter it's built from.
 */

const FAILURE_WINDOW_SECS = 300
const FAILURE_THRESHOLD = 5

function circuitKey(modelId: string): { key: string; expiresAt: Date } {
  const windowMs = FAILURE_WINDOW_SECS * 1000
  const windowId = Math.floor(Date.now() / windowMs) * windowMs
  return {
    key: `ai-circuit:${modelId}:${windowId}`,
    // Keep document alive for 2x the window, same margin `rateLimit.ts` uses
    // so TTL deletion doesn't race with a read against the same window.
    expiresAt: new Date(windowId + windowMs * 2),
  }
}

/**
 * Records one availability failure (§21.3's `isModelUnavailable` class —
 * empty credits, retired model, upstream capacity) against `modelId`. Fails
 * open silently on any database error: a circuit breaker that can itself go
 * down must never be the reason a request fails, matching `checkRateLimit`'s
 * posture.
 */
export async function recordModelFailure(modelId: string): Promise<void> {
  const { key, expiresAt } = circuitKey(modelId)
  try {
    await connectDB()
    await RateLimitModel.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true },
    )
  } catch {
    // Concurrent-upsert duplicate-key races are possible here too (see
    // `rateLimit.ts`); losing one failure count to it is harmless — the
    // threshold only needs to be crossed eventually, not exactly on this call.
  }
}

/**
 * True once `modelId` has failed FAILURE_THRESHOLD+ times in the current
 * window. Read-only — checking never itself perturbs the count a real
 * failure would record. Fails open (reports closed) on any database error.
 */
export async function isCircuitOpen(modelId: string): Promise<boolean> {
  const { key } = circuitKey(modelId)
  try {
    await connectDB()
    const doc = await RateLimitModel.findOne({ key }).lean<{ count?: number } | null>()
    return (doc?.count ?? 0) >= FAILURE_THRESHOLD
  } catch {
    return false
  }
}
