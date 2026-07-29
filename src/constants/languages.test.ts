import { describe, it, expect } from "vitest"
import {
  LEARNING_LEVELS,
  formatLevel,
  formatLevelWithMeaning,
  migrateLegacyLevel,
} from "./languages"

describe("formatLevel", () => {
  it("keeps CEFR codes short for compact badges", () => {
    expect(formatLevel("b1")).toBe("B1")
    expect(formatLevel("c2")).toBe("C2")
  })

  it("uses plain words where the stored value is not a code", () => {
    expect(formatLevel("native")).toBe("Native")
    expect(formatLevel("unsure")).toBe("I'm not sure")
  })

  it("is case insensitive", () => {
    expect(formatLevel("B1")).toBe("B1")
    expect(formatLevel("Native")).toBe("Native")
  })
})

describe("formatLevelWithMeaning", () => {
  // "A1" means nothing to a learner who has not met the framework, and the
  // level pickers previously offered nothing else.
  it("explains every CEFR code", () => {
    expect(formatLevelWithMeaning("a1")).toBe("A1 · Beginner")
    expect(formatLevelWithMeaning("a2")).toBe("A2 · Elementary")
    expect(formatLevelWithMeaning("b1")).toBe("B1 · Intermediate")
    expect(formatLevelWithMeaning("b2")).toBe("B2 · Upper intermediate")
    expect(formatLevelWithMeaning("c1")).toBe("C1 · Advanced")
    expect(formatLevelWithMeaning("c2")).toBe("C2 · Proficient")
  })

  it("does not pad values that are already plain words", () => {
    expect(formatLevelWithMeaning("unsure")).toBe("I'm not sure")
    expect(formatLevelWithMeaning("native")).toBe("Native")
  })

  it("labels every selectable learning level", () => {
    for (const level of LEARNING_LEVELS) {
      const label = formatLevelWithMeaning(level)
      expect(label.length).toBeGreaterThan(0)
      // A bare code would mean the meaning lookup missed this level.
      if (level !== "unsure") expect(label).toContain("·")
    }
  })
})

describe("migrateLegacyLevel", () => {
  it("maps pre-CEFR values onto the nearest code", () => {
    expect(migrateLegacyLevel("beginner")).toBe("unsure")
    expect(migrateLegacyLevel("intermediate")).toBe("b1")
    expect(migrateLegacyLevel("advanced")).toBe("c1")
  })

  it("leaves native and existing codes alone", () => {
    expect(migrateLegacyLevel("native")).toBe("native")
    expect(migrateLegacyLevel("B2")).toBe("b2")
  })
})
