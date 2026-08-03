import { describe, it, expect } from "vitest"
import { getBanRedirect } from "./ban-access"

describe("getBanRedirect", () => {
  it("does not redirect when the user is not banned", () => {
    expect(getBanRedirect("/dashboard", false, false)).toBeNull()
  })

  it("redirects a banned user away from a protected route", () => {
    expect(getBanRedirect("/dashboard", true, false)).toBe("/login")
  })

  it("redirects a banned user away from an admin route too", () => {
    expect(getBanRedirect("/admin/users", true, false)).toBe("/login")
  })

  it("does not redirect a banned user off a public path, so /login itself stays reachable", () => {
    expect(getBanRedirect("/login", true, true)).toBeNull()
  })

  it("does not redirect an unbanned user off a public path", () => {
    expect(getBanRedirect("/", false, true)).toBeNull()
  })
})
