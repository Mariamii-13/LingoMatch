import { getLanguage } from '@/constants/languages'
import type { TutorLevel } from '@/config/ai-practice'
import type { LanguageProfile } from '@/lib/language-profile'

export type TutorContext = {
  targetLanguage: string
  nativeLanguages: string[]
  explanationLanguage: string
  level: TutorLevel
}

export function buildTutorContext(
  profile: LanguageProfile,
  targetLanguageCode: string,
): TutorContext | null {
  const target = profile.learningLanguages.find(
    (language) => language.code === targetLanguageCode,
  )
  if (!target) return null

  return {
    targetLanguage: getLanguage(target.code).name,
    nativeLanguages: profile.nativeLanguages.map((code) => getLanguage(code).name),
    explanationLanguage: getLanguage(profile.preferredExplanationLanguage).name,
    level: target.level === 'unsure'
      ? 'unsure'
      : (target.level.toUpperCase() as TutorLevel),
  }
}
