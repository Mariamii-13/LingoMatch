import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node's strip-types test runner loads the TypeScript source directly.
import { applyMessageToConversations, reconcileMessages, type CanonicalMessage } from "./reconcile.ts"

const older: CanonicalMessage = {
  id: "message-1",
  conversationId: "conversation-1",
  senderId: "user-a",
  content: "First",
  createdAt: "2026-07-26T10:00:00.000Z",
}

const newer: CanonicalMessage = {
  id: "message-2",
  conversationId: "conversation-1",
  senderId: "user-b",
  content: "Second",
  createdAt: "2026-07-26T10:01:00.000Z",
}

test("reconcileMessages deduplicates by stable database message ID", () => {
  assert.deepEqual(reconcileMessages([older], [older]), [older])
})

test("reconcileMessages keeps messages in chronological order", () => {
  assert.deepEqual(reconcileMessages([newer], [older]), [older, newer])
})

test("applyMessageToConversations updates the preview and promotes the conversation", () => {
  const conversations = [
    { id: "conversation-2", lastMessage: { content: "Other", createdAt: "2026-07-26T10:00:30.000Z" } },
    { id: "conversation-1", lastMessage: { content: "First", createdAt: older.createdAt } },
  ]

  const result = applyMessageToConversations(conversations, newer)

  assert.equal(result[0].id, "conversation-1")
  assert.deepEqual(result[0].lastMessage, {
    content: "Second",
    createdAt: newer.createdAt,
  })
})
