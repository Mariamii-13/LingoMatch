import { describe, it, expect } from "vitest"

/**
 * Encodes the paging rule used by GET /api/chat/[sessionId]/messages.
 *
 * The handler sorted ascending with a limit, so with no cursor it returned the
 * first 100 messages a conversation ever had. Past that length both participants
 * were permanently stuck at the beginning and never saw anything new. These
 * tests pin the corrected rule, which only shows up once a conversation is
 * longer than one page.
 */
const PAGE_SIZE = 100

type Row = { id: number; createdAt: string }

/** Mirrors the handler: descending + reverse without a cursor, ascending with one. */
function selectWindow(all: Row[], after?: string): Row[] {
  const ascending = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  if (after) {
    return ascending.filter((row) => row.createdAt > after).slice(0, PAGE_SIZE)
  }
  const descending = [...ascending].reverse()
  return descending.slice(0, PAGE_SIZE).reverse()
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

  it("returns only newer messages when given a cursor", () => {
    const all = conversation(10)
    const cursor = all[7].createdAt
    expect(selectWindow(all, cursor).map((r) => r.id)).toEqual([8, 9])
  })

  it("returns nothing when the cursor is already current", () => {
    const all = conversation(10)
    expect(selectWindow(all, all[9].createdAt)).toEqual([])
  })

  it("caps a cursor fetch at one page", () => {
    const all = conversation(400)
    expect(selectWindow(all, all[0].createdAt)).toHaveLength(PAGE_SIZE)
  })
})
