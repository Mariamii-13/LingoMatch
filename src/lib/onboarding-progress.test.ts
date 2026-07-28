import { describe, expect, it } from "vitest"
import {
  REQUIRED_STEPS,
  STEP_ORDER,
  areRequiredStepsComplete,
  buildSetupRedirect,
  buildSkipTarget,
  getFirstIncompleteRequiredStep,
  getFirstIncompleteStep,
  resolveSetupNav,
  type UserProfileData,
} from "./onboarding-progress"

const emptyUser: UserProfileData = {}

const languagesOnlyUser: UserProfileData = {
  languageProfile: {
    nativeLanguages: ["en"],
    learningLanguages: [{ code: "es", level: "a1", isPrimary: true }],
    preferredExplanationLanguage: "en",
  },
}

const fullUser: UserProfileData = {
  ...languagesOnlyUser,
  displayName: "Alex",
  username: "alex",
  country: "GE",
  interests: { music: ["rock"] },
  conversationModes: ["casual"],
  aiProfile: { conversationGoals: ["fluency"] },
}

describe("step order", () => {
  it("puts the required language step first so the forced entry point is step 1", () => {
    expect(STEP_ORDER[0]).toBe("languages")
    expect(new Set(STEP_ORDER).size).toBe(STEP_ORDER.length)
  })
})

describe("required steps", () => {
  it("treats only the language profile as required", () => {
    expect(REQUIRED_STEPS).toEqual(["languages"])
  })

  it("reports required completion independently of optional steps", () => {
    expect(areRequiredStepsComplete(emptyUser)).toBe(false)
    expect(areRequiredStepsComplete(languagesOnlyUser)).toBe(true)
    expect(areRequiredStepsComplete(fullUser)).toBe(true)
  })

  it("returns the first incomplete required step", () => {
    expect(getFirstIncompleteRequiredStep(emptyUser)).toBe("languages")
    expect(getFirstIncompleteRequiredStep(languagesOnlyUser)).toBeNull()
  })
})

describe("resolveSetupNav", () => {
  it("hides the back link while required setup is unfinished, because every target bounces back", () => {
    expect(resolveSetupNav("dashboard", emptyUser).showBack).toBe(false)
    expect(resolveSetupNav("settings", emptyUser).showBack).toBe(false)
    expect(resolveSetupNav("dashboard", null).showBack).toBe(false)
  })

  it("shows the back link once required setup is done", () => {
    expect(resolveSetupNav("dashboard", languagesOnlyUser)).toEqual({
      backHref: "/dashboard",
      backLabel: "← Dashboard",
      showBack: true,
    })
    expect(resolveSetupNav("settings", fullUser)).toEqual({
      backHref: "/settings",
      backLabel: "← Settings",
      showBack: true,
    })
  })
})

describe("buildSetupRedirect", () => {
  it("sends a first-time user straight to the dashboard once required setup is saved", () => {
    expect(
      buildSetupRedirect({
        currentStep: "languages",
        savedUser: languagesOnlyUser,
        wasFirstRun: true,
        from: "dashboard",
      }),
    ).toBe("/dashboard")
  })

  it("keeps a first-time user on the page when required setup is still unfinished", () => {
    expect(
      buildSetupRedirect({
        currentStep: "languages",
        savedUser: emptyUser,
        wasFirstRun: true,
        from: "dashboard",
      }),
    ).toBeNull()
  })

  it("routes a first-time user to the outstanding required step from another page", () => {
    expect(
      buildSetupRedirect({
        currentStep: "profile",
        savedUser: emptyUser,
        wasFirstRun: true,
        from: "dashboard",
      }),
    ).toBe("/languages?from=dashboard")
  })

  it("walks the remaining optional steps for returning users", () => {
    expect(
      buildSetupRedirect({
        currentStep: "languages",
        savedUser: languagesOnlyUser,
        wasFirstRun: false,
        from: "settings",
      }),
    ).toBe("/profile?from=settings")
  })

  it("stays on the page when the current step is the only one left", () => {
    const missingModes = { ...fullUser, conversationModes: [] }
    expect(
      buildSetupRedirect({
        currentStep: "modes",
        savedUser: missingModes,
        wasFirstRun: false,
        from: "dashboard",
      }),
    ).toBeNull()
  })

  it("returns to the dashboard when nothing is left", () => {
    expect(
      buildSetupRedirect({
        currentStep: "modes",
        savedUser: fullUser,
        wasFirstRun: false,
        from: "dashboard",
      }),
    ).toBe("/dashboard")
  })
})

describe("buildSkipTarget", () => {
  it("moves to the next step in order", () => {
    expect(buildSkipTarget("languages", "dashboard")).toBe("/profile?from=dashboard")
  })

  it("returns to the entry point after the last step", () => {
    const last = STEP_ORDER[STEP_ORDER.length - 1]
    expect(buildSkipTarget(last, "settings")).toBe("/settings")
    expect(buildSkipTarget(last, "dashboard")).toBe("/dashboard")
  })
})

describe("getFirstIncompleteStep", () => {
  it("follows the new step order", () => {
    expect(getFirstIncompleteStep(emptyUser)).toBe("languages")
    expect(getFirstIncompleteStep(languagesOnlyUser)).toBe("profile")
    expect(getFirstIncompleteStep(fullUser)).toBeNull()
  })
})
