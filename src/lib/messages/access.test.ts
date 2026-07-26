import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node's strip-types test runner loads the TypeScript source directly.
import { isConversationParticipant } from "./access.ts"

test("conversation access is limited to participants", () => {
  const participants = [{ toString: () => "user-a" }, { toString: () => "user-b" }]

  assert.equal(isConversationParticipant(participants, "user-a"), true)
  assert.equal(isConversationParticipant(participants, "user-c"), false)
})
