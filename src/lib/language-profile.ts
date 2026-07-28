import { LANGUAGES, migrateLegacyLevel } from '@/constants/languages'

export const LANGUAGE_PROFILE_VERSION = 1 as const
export const LANGUAGE_LEVELS = ['unsure', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const

export type LanguageProfileLevel = (typeof LANGUAGE_LEVELS)[number]

export type LearningLanguageProfile = {
  code: string
  level: LanguageProfileLevel
  isPrimary: boolean
}

export type LanguageProfile = {
  version: typeof LANGUAGE_PROFILE_VERSION
  nativeLanguages: string[]
  learningLanguages: LearningLanguageProfile[]
  preferredExplanationLanguage: string
  completedAt: Date
}

export type LanguageProfileInput = Omit<LanguageProfile, 'version' | 'completedAt'>

export type LegacyLanguageEntry = {
  code: string
  level: string
}

export type LanguageProfileSource = {
  languageProfile?: Partial<LanguageProfile> | null
  nativeLanguages?: string[] | null
  spokenLanguages?: LegacyLanguageEntry[] | null
  learningLanguages?: LegacyLanguageEntry[] | null
}

export type LanguageProfileUpdate = {
  languageProfile: LanguageProfile
  nativeLanguages: string[]
  spokenLanguages: LegacyLanguageEntry[]
  learningLanguages: LegacyLanguageEntry[]
}

const SUPPORTED_CODES = new Set(LANGUAGES.map((language) => language.code))
const PROFILE_LEVELS = new Set<string>(LANGUAGE_LEVELS)

export function normalizeLanguageCode(code: string): string {
  return code.trim().toLowerCase()
}

export function isSupportedLanguageCode(code: string): boolean {
  return SUPPORTED_CODES.has(normalizeLanguageCode(code))
}

export function normalizeLanguageProfileLevel(level: string): LanguageProfileLevel {
  const migrated = migrateLegacyLevel(level)
  if (migrated === 'beginner') return 'unsure'
  return PROFILE_LEVELS.has(migrated) ? (migrated as LanguageProfileLevel) : 'unsure'
}

function uniqueSupportedCodes(codes: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const rawCode of codes) {
    const code = normalizeLanguageCode(rawCode)
    if (!SUPPORTED_CODES.has(code) || seen.has(code)) continue
    seen.add(code)
    result.push(code)
  }
  return result
}

function normalizeLearningLanguages(
  languages: readonly { code?: unknown; level?: unknown; isPrimary?: unknown }[],
): LearningLanguageProfile[] {
  const seen = new Set<string>()
  const result: LearningLanguageProfile[] = []

  for (const language of languages) {
    if (typeof language.code !== 'string' || typeof language.level !== 'string') continue
    const code = normalizeLanguageCode(language.code)
    if (!SUPPORTED_CODES.has(code) || seen.has(code)) continue
    seen.add(code)
    result.push({
      code,
      level: normalizeLanguageProfileLevel(language.level),
      isPrimary: language.isPrimary === true,
    })
  }

  if (result.length > 0) {
    const primaryIndex = result.findIndex((language) => language.isPrimary)
    const selectedIndex = primaryIndex >= 0 ? primaryIndex : 0
    result.forEach((language, index) => {
      language.isPrimary = index === selectedIndex
    })
  }

  return result
}

export function resolveLanguageProfile(
  source: LanguageProfileSource,
  now = new Date(),
): LanguageProfile {
  const canonical = source.languageProfile
  const canonicalNative = Array.isArray(canonical?.nativeLanguages)
    ? canonical.nativeLanguages
    : []
  const legacyNative = [
    ...(source.nativeLanguages ?? []),
    ...(source.spokenLanguages ?? [])
      .filter((language) => language.level.toLowerCase() === 'native')
      .map((language) => language.code),
  ]
  const nativeLanguages = uniqueSupportedCodes(
    canonicalNative.length > 0 ? canonicalNative : legacyNative,
  )

  const canonicalLearning = Array.isArray(canonical?.learningLanguages)
    ? canonical.learningLanguages
    : []
  const learningLanguages = normalizeLearningLanguages(
    canonicalLearning.length > 0 ? canonicalLearning : (source.learningLanguages ?? []),
  )

  const requestedExplanation = normalizeLanguageCode(
    canonical?.preferredExplanationLanguage ?? '',
  )
  const preferredExplanationLanguage = nativeLanguages.includes(requestedExplanation)
    ? requestedExplanation
    : (nativeLanguages[0] ?? '')

  const completedAt = canonical?.completedAt
    ? new Date(canonical.completedAt)
    : new Date(now)

  return {
    version: LANGUAGE_PROFILE_VERSION,
    nativeLanguages,
    learningLanguages,
    preferredExplanationLanguage,
    completedAt,
  }
}

export function isLanguageProfileComplete(profile: LanguageProfile): boolean {
  if (profile.nativeLanguages.length === 0 || profile.learningLanguages.length === 0) {
    return false
  }
  if (!profile.nativeLanguages.includes(profile.preferredExplanationLanguage)) return false
  if (profile.learningLanguages.filter((language) => language.isPrimary).length !== 1) return false

  const native = new Set(profile.nativeLanguages)
  return profile.learningLanguages.every(
    (language) => !native.has(language.code) && isSupportedLanguageCode(language.code),
  )
}

export function buildLanguageProfileUpdate(
  input: LanguageProfileInput,
  existingSpokenLanguages: readonly LegacyLanguageEntry[] = [],
  now = new Date(),
): LanguageProfileUpdate {
  const languageProfile = resolveLanguageProfile({
    languageProfile: {
      ...input,
      version: LANGUAGE_PROFILE_VERSION,
      completedAt: now,
    },
  }, now)

  const nativeSet = new Set(languageProfile.nativeLanguages)
  const learningSet = new Set(languageProfile.learningLanguages.map((language) => language.code))
  const preservedSpoken = existingSpokenLanguages
    .map((language) => ({
      code: normalizeLanguageCode(language.code),
      level: language.level.toLowerCase() === 'native' ? 'native' : 'other',
    }))
    .filter(
      (language, index, all) =>
        isSupportedLanguageCode(language.code) &&
        language.level !== 'native' &&
        !nativeSet.has(language.code) &&
        !learningSet.has(language.code) &&
        all.findIndex((candidate) => candidate.code === language.code) === index,
    )

  return {
    languageProfile,
    nativeLanguages: [...languageProfile.nativeLanguages],
    spokenLanguages: [
      ...languageProfile.nativeLanguages.map((code) => ({ code, level: 'native' })),
      ...preservedSpoken,
    ],
    learningLanguages: languageProfile.learningLanguages.map(({ code, level }) => ({
      code,
      level,
    })),
  }
}

export function profilesEqual(a: LanguageProfile, b: LanguageProfile): boolean {
  return JSON.stringify({ ...a, completedAt: undefined }) ===
    JSON.stringify({ ...b, completedAt: undefined })
}
