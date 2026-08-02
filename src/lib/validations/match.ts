import { z } from 'zod'
import { isSupportedLanguageCode, normalizeLanguageCode } from '@/lib/language-profile'

const MAX_INTERESTS = 20
const MAX_INTEREST_LENGTH = 40
const MAX_COUNTRY_LENGTH = 60

/**
 * Roadmap #32: how far ahead a user is willing to be matched, not just
 * right now. 0 keeps today's exact behaviour (instant queue only). The
 * other values are minutes and become a standing `MatchAvailability` row
 * when no live partner is found immediately.
 */
export const AVAILABILITY_MINUTES = [0, 60, 360, 1440] as const
export type AvailabilityMinutes = (typeof AVAILABILITY_MINUTES)[number]

/**
 * Language codes are normalised here rather than trusted from the client.
 *
 * Matching pairs two queued requests by comparing one user's target language
 * with the other's native language using exact string equality. The picker
 * emits lowercase codes while the match pages seeded uppercase defaults, so a
 * perfectly reciprocal pair silently failed to match on letter case alone —
 * users simply waited forever. Normalising at the boundary means every stored
 * and queried code has one canonical form regardless of what the caller sends.
 */
const languageCode = z
  // The explicit error covers a missing or non-string field too; without it Zod
  // reports "expected string, received undefined", which is not a sentence to
  // show a learner in a toast.
  .string({ error: 'Please choose both languages' })
  .trim()
  .min(1, 'Please choose both languages')
  .transform(normalizeLanguageCode)
  .refine(isSupportedLanguageCode, { message: 'Unsupported language' })

export const matchRequestSchema = z
  .object({
    targetLanguage: languageCode,
    nativeLanguage: languageCode,
    interests: z
      .array(z.string().trim().max(MAX_INTEREST_LENGTH))
      .max(MAX_INTERESTS)
      .optional()
      .default([]),
    countryPreference: z.string().trim().max(MAX_COUNTRY_LENGTH).optional().default(''),
    availabilityMinutes: z
      .number()
      .refine((v): v is AvailabilityMinutes => (AVAILABILITY_MINUTES as readonly number[]).includes(v), {
        message: 'Unsupported availability window',
      })
      .optional()
      .default(0),
  })
  .refine((data) => data.targetLanguage !== data.nativeLanguage, {
    message: 'Choose a target language different from your native language',
    path: ['targetLanguage'],
  })

export type MatchRequestInput = z.infer<typeof matchRequestSchema>
