/**
 * Roadmap #20: the NextAuth `jwt` callback ran on every single request,
 * costing a MongoDB read per page load just to keep `role`/`plan`/etc fresh.
 * Bounding it to a refresh interval trades immediate ban propagation (a
 * banned user's existing session can act for up to this long) for one fewer
 * database round trip on almost every request — an explicit, accepted
 * tradeoff (PROJECT_PASSPORT.md roadmap #20).
 */
export const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000

export function shouldRefreshToken(
  refreshedAt: number | undefined,
  now: number,
  intervalMs: number = TOKEN_REFRESH_INTERVAL_MS
): boolean {
  if (refreshedAt === undefined) return true
  return now - refreshedAt >= intervalMs
}
