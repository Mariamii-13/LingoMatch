import { describe, it, expect } from "vitest"

/**
 * Encodes the paging rule used by GET /api/chat/[sessionId]/messages.
 *
 * The handler sorted ascending with a limit, so with no cursor it returned the
 * first 100 messages a conversation ever had. Past that length both participants
 * were permanently stuck at the beginning and never saw anything new. These
 * tests pin the corrected rule, which only shows up once a conversation is
 * longer than one page.
 *
 * `before` (added for roadmap #19, backwards pagination) walks the same window
 * backwards: still page-sized and still returned in chronological order, just
 * anchored above a given timestamp instead of at "now".
 */
const PAGE_SIZE = 100

type Row = { id: number; createdAt: string }

/** Mirrors the handler: descending + reverse without a cursor, ascending with `after`, descending + reverse with `before`. */
function selectWindow(all: Row[], opts?: { after?: string; before?: string }): Row[] {
  const ascending = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  if (opts?.after) {
    return ascending.filter((row) => row.createdAt > opts.after!).slice(0, PAGE_SIZE)
  }
  if (opts?.before) {
    const olderDescending = [...ascending]
      .filter((row) => row.createdAt < opts.before!)
      .reverse()
    return olderDescending.slice(0, PAGE_SIZE).reverse()
  }
  const descending = [...ascending].reverse()
  return descending.slice(0, PAGE_SIZE).reverse()
}

function hasMore(all: Row[], before: string): boolean {
  return selectWindow(all, { before }).length === PAGE_SIZE
}

function conversation(length: number): Row[] {
  return Array.from({ length }, (_, i) => ({
    id: i,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
  }))
}

describe("message history window", () => {
  it("returns everything for a short conversation, in order", () => {
    const all = conversation(5)
    expect(selectWindow(all).map((r) => r.id)).toEqual([0, 1, 2, 3, 4])
  })

  it("returns the newest page for a long conversation, not the oldest", () => {
    const all = conversation(250)
    const window = selectWindow(all)
    expect(window).toHaveLength(PAGE_SIZE)
    // The regression: this used to be message 0 through 99.
    expect(window[0].id).toBe(150)
    expect(window[window.length - 1].id).toBe(249)
  })

  it("keeps the newest page in chronological order", () => {
    const window = selectWindow(conversation(250))
    const timestamps = window.map((r) => r.createdAt)
    expect([...timestamps].sort()).toEqual(timestamps)
  })

  it("includes a message sent after a long backlog", () => {
    const all = conversation(150)
    expect(selectWindow(all).some((r) => r.id === 149)).toBe(true)
  })

  it("returns only newer messages when given an after cursor", () => {
    const all = conversation(10)
    const cursor = all[7].createdAt
    expect(selectWindow(all, { after: cursor }).map((r) => r.id)).toEqual([8, 9])
  })

  it("returns nothing when the after cursor is already current", () => {
    const all = conversation(10)
    expect(selectWindow(all, { after: all[9].createdAt })).toEqual([])
  })

  it("caps an after-cursor fetch at one page", () => {
    const all = conversation(400)
    expect(selectWindow(all, { after: all[0].createdAt })).toHaveLength(PAGE_SIZE)
  })

  it("returns the page just above a before cursor, in chronological order", () => {
    const all = conversation(250)
    const window = selectWindow(all, { before: all[150].createdAt })
    expect(window).toHaveLength(PAGE_SIZE)
    expect(window[0].id).toBe(50)
    expect(window[window.length - 1].id).toBe(149)
  })

  it("returns everything older when less than a page remains", () => {
    const all = conversation(30)
    const window = selectWindow(all, { before: all[20].createdAt })
    expect(window.map((r) => r.id)).toEqual(Array.from({ length: 20 }, (_, i) => i))
  })

  it("returns nothing older than the very first message", () => {
    const all = conversation(10)
    expect(selectWindow(all, { before: all[0].createdAt })).toEqual([])
  })

  it("reports more history remains only when a full page comes back", () => {
    const all = conversation(250)
    expect(hasMore(all, all[150].createdAt)).toBe(true)
    expect(hasMore(all, all[20].createdAt)).toBe(false)
  })
})
