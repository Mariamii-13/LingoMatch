import { expect, test } from "vitest"

import { canonicalConversationPath } from "./routes"

test("legacy conversation IDs map to the canonical messages route", () => {
  expect(canonicalConversationPath("507f1f77bcf86cd799439011")).toBe(
    "/messages/507f1f77bcf86cd799439011"
  )
})

test("conversation IDs are encoded before redirecting", () => {
  expect(canonicalConversationPath("a/b")).toBe("/messages/a%2Fb")
})
