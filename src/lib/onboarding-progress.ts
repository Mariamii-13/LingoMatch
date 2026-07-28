// src/lib/onboarding-progress.ts
import type { AIProfile } from "@/types"

export interface UserProfileData {
  displayName?: string
  username?: string
  country?: string
  spokenLanguages?: { code: string; level: string }[]
  learningLanguages?: { code: string; level: string }[]
  languageProfile?: {
    nativeLanguages: string[]
    learningLanguages: { code: string; level: string; isPrimary: boolean }[]
    preferredExplanationLanguage: string
  }
  interests?: Record<string, string[]>
  aiProfile?: Partial<AIProfile>
  conversationModes?: string[]
}

export type OnboardingStep =
  | "profile"
  | "ai-preferences"
  | "languages"
  | "interests"
  | "modes"

// Languages comes first: it is the only step the app gates on, so a new user's
// forced entry point must also be step 1 of the visible sequence.
export const STEP_ORDER: OnboardingStep[] = [
  "languages",
  "profile",
  "interests",
  "modes",
  "ai-preferences",
]

// Everything except the language profile is optional and can be finished later
// from the dashboard card or settings.
export const REQUIRED_STEPS: OnboardingStep[] = ["languages"]

export const STEP_PATHS: Record<OnboardingStep, string> = {
  "profile": "/profile",
  "ai-preferences": "/ai-preferences",
  "languages": "/languages",
  "interests": "/interests",
  "modes": "/mode",
}

export const STEP_LABELS: Record<OnboardingStep, string> = {
  "profile": "Profile",
  "ai-preferences": "AI Preferences",
  "languages": "Languages",
  "interests": "Interests",
  "modes": "Modes",
}

export function getStepStatus(
  user: UserProfileData
): Record<OnboardingStep, boolean> {
  const interests = user.interests ?? {}
  const hasAnyInterest = Object.values(interests).some((arr) => arr.length > 0)

  const ai = user.aiProfile ?? {}
  const hasAIPrefs =
    (ai.conversationGoals?.length ?? 0) > 0 ||
    (ai.preferredTraits?.length ?? 0) > 0 ||
    (ai.personalityNotes?.trim().length ?? 0) > 0 ||
    (ai.topicsToAvoid?.length ?? 0) > 0

  return {
    profile:
      !!(
        user.displayName?.trim() &&
        user.username?.trim() &&
        user.country?.trim()
      ),
    "ai-preferences": hasAIPrefs,
    languages: user.languageProfile
      ? user.languageProfile.nativeLanguages.length > 0 &&
        user.languageProfile.learningLanguages.length > 0 &&
        user.languageProfile.nativeLanguages.includes(
          user.languageProfile.preferredExplanationLanguage,
        )
      : (user.spokenLanguages?.length ?? 0) > 0 &&
        (user.learningLanguages?.length ?? 0) > 0,
    interests: hasAnyInterest,
    modes: (user.conversationModes?.length ?? 0) > 0,
  }
}

export function getFirstIncompleteStep(
  user: UserProfileData
): OnboardingStep | null {
  const status = getStepStatus(user)
  return STEP_ORDER.find((s) => !status[s]) ?? null
}

export function getCompletedCount(user: UserProfileData): number {
  return Object.values(getStepStatus(user)).filter(Boolean).length
}

export function getCompletionPercentage(user: UserProfileData): number {
  return Math.round((getCompletedCount(user) / STEP_ORDER.length) * 100)
}

export function areRequiredStepsComplete(user: UserProfileData): boolean {
  const status = getStepStatus(user)
  return REQUIRED_STEPS.every((step) => status[step])
}

export function getFirstIncompleteRequiredStep(
  user: UserProfileData
): OnboardingStep | null {
  const status = getStepStatus(user)
  return REQUIRED_STEPS.find((step) => !status[step]) ?? null
}

function entryHref(from: string): string {
  return from === "settings" ? "/settings" : "/dashboard"
}

/**
 * While required setup is unfinished the app redirects every other page back to
 * the outstanding step, so a "back" link would be a dead end. Hide it instead.
 */
export function resolveSetupNav(
  from: string,
  user: UserProfileData | null
): { backHref: string; backLabel: string; showBack: boolean } {
  return {
    backHref: entryHref(from),
    backLabel: from === "settings" ? "← Settings" : "← Dashboard",
    showBack: user ? areRequiredStepsComplete(user) : false,
  }
}

/**
 * Where to go after a step is saved.
 * First-time users leave setup as soon as the required step is done, so they
 * reach real practice in one screen. Returning users keep walking the
 * remaining optional steps they opted into.
 */
export function buildSetupRedirect(args: {
  currentStep: OnboardingStep
  savedUser: UserProfileData
  wasFirstRun: boolean
  from: string
}): string | null {
  const { currentStep, savedUser, wasFirstRun, from } = args

  if (wasFirstRun) {
    if (areRequiredStepsComplete(savedUser)) return "/dashboard"
    const nextRequired = getFirstIncompleteRequiredStep(savedUser)
    if (!nextRequired || nextRequired === currentStep) return null
    return `${STEP_PATHS[nextRequired]}?from=${from}`
  }

  const next = getFirstIncompleteStep(savedUser)
  if (!next) return "/dashboard"
  if (next === currentStep) return null
  return `${STEP_PATHS[next]}?from=${from}`
}

export function buildSkipTarget(currentStep: OnboardingStep, from: string): string {
  const next = STEP_ORDER[STEP_ORDER.indexOf(currentStep) + 1]
  if (!next) return entryHref(from)
  return `${STEP_PATHS[next]}?from=${from}`
}
