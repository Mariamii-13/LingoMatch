import { connectDB } from './db'
import RateLimitModel from './models/RateLimit'

/**
 * Fixed-window rate limiter backed by MongoDB.
 * Works across all Vercel serverless function instances.
 *
 * @param action  Unique action name (e.g. 'message', 'match-queue')
 * @param userId  Subject of the limit
 * @param limit   Max requests allowed in the window
 * @param windowSecs  Window duration in seconds
 * @returns { allowed: false } if the limit is exceeded
 */
export async function checkRateLimit(
  action: string,
  userId: string,
  limit: number,
  windowSecs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now()
  const windowMs = windowSecs * 1000
  const windowId = Math.floor(now / windowMs) * windowMs
  const key = `${action}:${userId}:${windowId}`
  // Keep document alive for 2× the window so TTL deletion doesn't race with reads
  const expiresAt = new Date(windowId + windowMs * 2)

  try {
    // Connecting is inside the guard on purpose: an unreachable database used
    // to throw straight out of here, so an outage turned every rate-limited
    // endpoint into a 500 instead of degrading. Failing open is the trade-off
    // this limiter already makes everywhere else.
    await connectDB()

    const doc = await RateLimitModel.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: 'after' }
    )
    const count = (doc!.count as number)
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
  } catch (err: unknown) {
    // Concurrent upsert on the same key — retry as plain increment
    if ((err as { code?: number }).code === 11000) {
      const doc = await RateLimitModel.findOneAndUpdate(
        { key },
        { $inc: { count: 1 } },
        { returnDocument: 'after' }
      )
      const count = (doc?.count as number) ?? limit + 1
      return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
    }
    // Fail open on unexpected errors — don't block legitimate users
    return { allowed: true, remaining: 1 }
  }
}

/**
 * Records an amount against a fixed window without checking or returning any
 * limit — the counting half of a check-before/record-after pattern for
 * values that aren't known until after the guarded work completes (e.g. the
 * real dollar cost of an AI call, only available once the response has
 * arrived). Reuses `checkRateLimit`'s exact key/window scheme so a `peekUsage`
 * call for the same action/subject/window reads what this wrote.
 *
 * Fails soft and silently: a lost cost sample must never break an AI reply
 * that has already been generated and billed to the account regardless.
 */
export async function incrementUsage(
  action: string,
  subject: string,
  windowSecs: number,
  amount: number,
): Promise<void> {
  const now = Date.now()
  const windowMs = windowSecs * 1000
  const windowId = Math.floor(now / windowMs) * windowMs
  const key = `${action}:${subject}:${windowId}`
  const expiresAt = new Date(windowId + windowMs * 2)

  try {
    await connectDB()
    await RateLimitModel.findOneAndUpdate(
      { key },
      { $inc: { count: amount }, $setOnInsert: { expiresAt } },
      { upsert: true },
    )
  } catch {
    // Same duplicate-key race as checkRateLimit can happen here; a second
    // plain increment attempt is enough, and if that also fails the sample
    // is simply lost rather than surfaced to the caller.
    try {
      await RateLimitModel.findOneAndUpdate({ key }, { $inc: { count: amount } })
    } catch {
      // Fail soft.
    }
  }
}

/**
 * Reads a fixed window's current count without incrementing it — the
 * check half of the check-before/record-after pattern `incrementUsage`
 * writes for. Fails open (returns 0) on any error, same philosophy as
 * `checkRateLimit`: a read failure must never block a real request.
 */
export async function peekUsage(
  action: string,
  subject: string,
  windowSecs: number,
): Promise<number> {
  const now = Date.now()
  const windowMs = windowSecs * 1000
  const windowId = Math.floor(now / windowMs) * windowMs
  const key = `${action}:${subject}:${windowId}`

  try {
    await connectDB()
    const doc = await RateLimitModel.findOne({ key }).lean<{ count?: number } | null>()
    return doc?.count ?? 0
  } catch {
    return 0
  }
}
