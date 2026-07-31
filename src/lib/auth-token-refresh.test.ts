import { describe, it, expect } from "vitest"
import { shouldRefreshToken, TOKEN_REFRESH_INTERVAL_MS } from "./auth-token-refresh"

describe("shouldRefreshToken", () => {
  it("refreshes a token that has never been stamped", () => {
    expect(shouldRefreshToken(undefined, Date.now())).toBe(true)
  })

  it("does not refresh a token stamped just now", () => {
    const now = Date.now()
    expect(shouldRefreshToken(now, now)).toBe(false)
  })

  it("does not refresh a token stamped just under the interval ago", () => {
    const now = Date.now()
    expect(shouldRefreshToken(now - (TOKEN_REFRESH_INTERVAL_MS - 1), now)).toBe(false)
  })

  it("refreshes a token stamped exactly the interval ago", () => {
    const now = Date.now()
    expect(shouldRefreshToken(now - TOKEN_REFRESH_INTERVAL_MS, now)).toBe(true)
  })

  it("refreshes a token stamped well past the interval", () => {
    const now = Date.now()
    expect(shouldRefreshToken(now - TOKEN_REFRESH_INTERVAL_MS * 10, now)).toBe(true)
  })

  it("respects a custom interval", () => {
    const now = Date.now()
    expect(shouldRefreshToken(now - 30_000, now, 60_000)).toBe(false)
    expect(shouldRefreshToken(now - 60_000, now, 60_000)).toBe(true)
  })
})
