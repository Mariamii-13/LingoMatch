import { expect, test } from "vitest"

import { isConversationParticipant } from "./access"

test("conversation access is limited to participants", () => {
  const participants = [{ toString: () => "user-a" }, { toString: () => "user-b" }]

  expect(isConversationParticipant(participants, "user-a")).toBe(true)
  expect(isConversationParticipant(participants, "user-c")).toBe(false)
})
