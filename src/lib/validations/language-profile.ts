import { z } from 'zod'
import {
  LANGUAGE_LEVELS,
  isSupportedLanguageCode,
  normalizeLanguageCode,
} from '@/lib/language-profile'

const languageCodeSchema = z
  .string()
  .trim()
  .transform(normalizeLanguageCode)
  .refine(isSupportedLanguageCode, { message: 'Unsupported language code' })

export const languageProfileInputSchema = z
  .object({
    nativeLanguages: z.array(languageCodeSchema).min(1).max(10),
    learningLanguages: z
      .array(
        z.object({
          code: languageCodeSchema,
          level: z.enum(LANGUAGE_LEVELS),
          isPrimary: z.boolean(),
        }),
      )
      .min(1)
      .max(10),
    preferredExplanationLanguage: languageCodeSchema,
  })
  .superRefine((profile, ctx) => {
    const nativeSet = new Set(profile.nativeLanguages)
    if (nativeSet.size !== profile.nativeLanguages.length) {
      ctx.addIssue({ code: 'custom', path: ['nativeLanguages'], message: 'Duplicate native language' })
    }

    const targetCodes = profile.learningLanguages.map((language) => language.code)
    if (new Set(targetCodes).size !== targetCodes.length) {
      ctx.addIssue({ code: 'custom', path: ['learningLanguages'], message: 'Duplicate target language' })
    }
    if (targetCodes.some((code) => nativeSet.has(code))) {
      ctx.addIssue({
        code: 'custom',
        path: ['learningLanguages'],
        message: 'A target language cannot also be native',
      })
    }
    if (profile.learningLanguages.filter((language) => language.isPrimary).length !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['learningLanguages'],
        message: 'Exactly one target language must be primary',
      })
    }
    if (!nativeSet.has(profile.preferredExplanationLanguage)) {
      ctx.addIssue({
        code: 'custom',
        path: ['preferredExplanationLanguage'],
        message: 'Explanation language must be one of the native languages',
      })
    }
  })

export type ValidatedLanguageProfileInput = z.infer<typeof languageProfileInputSchema>
