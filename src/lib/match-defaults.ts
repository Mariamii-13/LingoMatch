import type { LanguageProfile } from '@/lib/language-profile'

export type MatchDefaults = {
  targetLanguage: string
  nativeLanguage: string
}

/**
 * Seeds the match form from what the user already told us during setup.
 *
 * The match pages used to hard-code Korean and English, so someone who had just
 * declared "I speak English, I'm learning Spanish" was offered a Korean partner
 * and had to correct both fields by hand. Codes here are already canonical
 * lowercase because the language profile normalises on write.
 */
export function resolveMatchDefaults(profile: LanguageProfile | null): MatchDefaults {
  if (!profile) return { targetLanguage: '', nativeLanguage: '' }

  const primaryTarget =
    profile.learningLanguages.find((language) => language.isPrimary) ??
    profile.learningLanguages[0]

  return {
    targetLanguage: primaryTarget?.code ?? '',
    nativeLanguage: profile.nativeLanguages[0] ?? '',
  }
}
