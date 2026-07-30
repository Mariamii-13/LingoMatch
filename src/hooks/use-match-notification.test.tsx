import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"

import { requestMatchNotificationPermission, useMatchFoundNotification } from "./use-match-notification"
import type { MatchPhase, MatchResult } from "@/types"

function makeResult(conversationId: string, name = "Alex"): MatchResult {
  return {
    conversationId,
    partner: {
      id: "partner-1",
      name,
      username: "alex99",
      country: "ES",
      flag: "🇪🇸",
      avatarInitials: "A",
      avatarColor: "#000",
      native: ["es"],
      learning: ["en"],
      interests: {},
    },
    compatibilityPct: 80,
  }
}

class MockNotification {
  static permission: NotificationPermission = "default"
  static requestPermission = vi.fn(async () => MockNotification.permission)
  static instances: MockNotification[] = []

  body?: string
  tag?: string
  onclick: (() => void) | null = null
  close = vi.fn()

  constructor(public title: string, options?: NotificationOptions) {
    this.body = options?.body
    this.tag = options?.tag
    MockNotification.instances.push(this)
  }
}

function Probe({ phase, result }: { phase: MatchPhase; result: MatchResult | null }) {
  useMatchFoundNotification(phase, result)
  return null
}

let originalNotification: unknown

beforeEach(() => {
  originalNotification = (globalThis as Record<string, unknown>).Notification
  MockNotification.instances = []
  MockNotification.permission = "default"
  MockNotification.requestPermission = vi.fn(async () => MockNotification.permission)
  ;(globalThis as Record<string, unknown>).Notification = MockNotification
})

afterEach(() => {
  vi.restoreAllMocks()
  ;(globalThis as Record<string, unknown>).Notification = originalNotification
})

describe("requestMatchNotificationPermission", () => {
  it("requests permission when it has never been decided", () => {
    requestMatchNotificationPermission()
    expect(MockNotification.requestPermission).toHaveBeenCalledOnce()
  })

  it("does not prompt again once granted", () => {
    MockNotification.permission = "granted"
    requestMatchNotificationPermission()
    expect(MockNotification.requestPermission).not.toHaveBeenCalled()
  })

  it("does not prompt again once denied", () => {
    MockNotification.permission = "denied"
    requestMatchNotificationPermission()
    expect(MockNotification.requestPermission).not.toHaveBeenCalled()
  })

  it("does nothing when Notification is unsupported", () => {
    ;(globalThis as Record<string, unknown>).Notification = undefined
    expect(() => requestMatchNotificationPermission()).not.toThrow()
  })
})

describe("useMatchFoundNotification", () => {
  it("does not notify while still searching", () => {
    MockNotification.permission = "granted"
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    render(<Probe phase="searching" result={null} />)
    expect(MockNotification.instances).toHaveLength(0)
  })

  it("does not notify when permission was never granted", () => {
    MockNotification.permission = "denied"
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    render(<Probe phase="found" result={makeResult("c1")} />)
    expect(MockNotification.instances).toHaveLength(0)
  })

  it("does not notify when the tab is visible and focused", () => {
    MockNotification.permission = "granted"
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible")
    vi.spyOn(document, "hasFocus").mockReturnValue(true)
    render(<Probe phase="found" result={makeResult("c1")} />)
    expect(MockNotification.instances).toHaveLength(0)
  })

  it("notifies with the partner's name when the tab is hidden", () => {
    MockNotification.permission = "granted"
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    render(<Probe phase="found" result={makeResult("c1", "Alex")} />)
    expect(MockNotification.instances).toHaveLength(1)
    expect(MockNotification.instances[0].body).toContain("Alex")
    expect(MockNotification.instances[0].tag).toBe("lingomatch-match-c1")
  })

  it("focuses the window and closes itself when clicked", () => {
    MockNotification.permission = "granted"
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    const focusSpy = vi.spyOn(window, "focus").mockImplementation(() => {})
    render(<Probe phase="found" result={makeResult("c1")} />)
    const notification = MockNotification.instances[0]
    notification.onclick?.()
    expect(focusSpy).toHaveBeenCalledOnce()
    expect(notification.close).toHaveBeenCalledOnce()
  })

  it("does not notify twice for the same match result on rerender", () => {
    MockNotification.permission = "granted"
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    const result = makeResult("c1")
    const view = render(<Probe phase="found" result={result} />)
    view.rerender(<Probe phase="found" result={result} />)
    expect(MockNotification.instances).toHaveLength(1)
  })

  it("notifies again for a new match after a previous one", () => {
    MockNotification.permission = "granted"
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden")
    const view = render(<Probe phase="found" result={makeResult("c1")} />)
    view.rerender(<Probe phase="found" result={makeResult("c2")} />)
    expect(MockNotification.instances).toHaveLength(2)
  })
})
