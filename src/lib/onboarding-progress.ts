// src/lib/onboarding-progress.ts
import type { AIProfile } from "@/types"

export interface UserProfileData {
  displayName?: string
  username?: string
  country?: string
  spokenLanguages?: { code: string; level: string }[]
  learningLanguages?: { code: string; level: string }[]
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

export const STEP_ORDER: OnboardingStep[] = [
  "profile",
  "ai-preferences",
  "languages",
  "interests",
  "modes",
]

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
    !!(ai.personalityNotes?.trim()) ||
    (ai.topicsToAvoid?.length ?? 0) > 0

  return {
    profile:
      !!(
        user.displayName?.trim() &&
        user.username?.trim() &&
        user.country?.trim()
      ),
    "ai-preferences": hasAIPrefs,
    languages:
      (user.spokenLanguages?.length ?? 0) > 0 &&
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
