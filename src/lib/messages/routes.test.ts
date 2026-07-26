import assert from "node:assert/strict"
import test from "node:test"

// @ts-expect-error Node's strip-types test runner loads the TypeScript source directly.
import { canonicalConversationPath } from "./routes.ts"

test("legacy conversation IDs map to the canonical messages route", () => {
  assert.equal(
    canonicalConversationPath("507f1f77bcf86cd799439011"),
    "/messages/507f1f77bcf86cd799439011"
  )
})

test("conversation IDs are encoded before redirecting", () => {
  assert.equal(canonicalConversationPath("a/b"), "/messages/a%2Fb")
})
