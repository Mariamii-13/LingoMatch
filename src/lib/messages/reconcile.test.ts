import { expect, test } from "vitest"

import {
  applyMessageToConversations,
  reconcileMessages,
  type CanonicalMessage,
} from "./reconcile"

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
  expect(reconcileMessages([older], [older])).toEqual([older])
})

test("reconcileMessages keeps messages in chronological order", () => {
  expect(reconcileMessages([newer], [older])).toEqual([older, newer])
})

test("applyMessageToConversations updates the preview and promotes the conversation", () => {
  const conversations = [
    { id: "conversation-2", lastMessage: { content: "Other", createdAt: "2026-07-26T10:00:30.000Z" } },
    { id: "conversation-1", lastMessage: { content: "First", createdAt: older.createdAt } },
  ]

  const result = applyMessageToConversations(conversations, newer)

  expect(result[0].id).toBe("conversation-1")
  expect(result[0].lastMessage).toEqual({
    content: "Second",
    createdAt: newer.createdAt,
  })
})
