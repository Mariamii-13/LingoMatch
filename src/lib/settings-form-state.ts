import type { AIProfile } from "@/types"
import type { UserProfileData } from "@/lib/onboarding-progress"

export type LanguageEntry = { code: string; level: string }

/** The user document as the settings form reads it. */
export type SettingsUser = UserProfileData & {
  avatar?: string
  email?: string
}

export type SettingsFormState = {
  avatarUrl: string
  displayName: string
  username: string
  email: string
  aiProfile: Partial<AIProfile> | undefined
  spoken: LanguageEntry[]
  learning: LanguageEntry[]
  explanationLanguage: string
  interestTags: string[]
}

export const EMPTY_SETTINGS_FORM_STATE: SettingsFormState = {
  avatarUrl: "",
  displayName: "",
  username: "",
  email: "",
  aiProfile: undefined,
  spoken: [],
  learning: [],
  explanationLanguage: "",
  interestTags: [],
}

/**
 * The settings form's starting values, derived from the stored user document.
 *
 * Extracted from the page's fetch-then-setState effect so it can be computed on
 * the server and unit tested. The legacy fallbacks matter: accounts created
 * before `languageProfile` existed still carry `spokenLanguages` and
 * `learningLanguages`, and reading only the new shape silently emptied the
 * Languages tab for them.
 */
export function buildSettingsFormState(user: SettingsUser | null): SettingsFormState {
  if (!user) return EMPTY_SETTINGS_FORM_STATE

  const profile = user.languageProfile

  const spoken: LanguageEntry[] = profile
    ? profile.nativeLanguages.map((code) => ({ code, level: "native" }))
    : (user.spokenLanguages ?? []).filter((language) => language.level === "native")

  const storedLearning = profile?.learningLanguages ?? user.learningLanguages ?? []
  const learning: LanguageEntry[] = storedLearning.map(({ code, level }) => ({ code, level }))

  return {
    avatarUrl: user.avatar ?? "",
    displayName: user.displayName ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    aiProfile: user.aiProfile,
    spoken,
    learning,
    // Falls back to the first native language so the tutor always has a
    // language to explain in, even for profiles saved before this was asked.
    explanationLanguage: profile?.preferredExplanationLanguage ?? spoken[0]?.code ?? "",
    interestTags: Object.values(user.interests ?? {}).flat(),
  }
}
