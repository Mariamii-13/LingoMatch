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
