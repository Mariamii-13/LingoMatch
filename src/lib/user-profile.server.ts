import 'server-only'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { migrateLegacyLevel } from '@/constants/languages'
import {
  buildLanguageProfileUpdate,
  isLanguageProfileComplete,
  resolveLanguageProfile,
} from '@/lib/language-profile'

/**
 * Brings legacy language shapes up to the current one. Exported because writes
 * must return the same normalised shape reads do.
 */
export function applyProfileMigrations(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  // Synthesize spokenLanguages from legacy nativeLanguages if not yet migrated
  if (
    !(raw.spokenLanguages as unknown[])?.length &&
    (raw.nativeLanguages as string[])?.length
  ) {
    raw.spokenLanguages = (raw.nativeLanguages as string[]).map((code) => ({
      code,
      level: 'native',
    }))
  }
  // Collapse any CEFR spoken levels to "other" (spoken section no longer uses CEFR)
  if ((raw.spokenLanguages as unknown[])?.length) {
    raw.spokenLanguages = (raw.spokenLanguages as { code: string; level: string }[]).map(
      (l) => ({ ...l, level: l.level === 'native' ? 'native' : 'other' }),
    )
  }
  // Normalise old Beginner/Intermediate/Advanced levels to CEFR
  if ((raw.learningLanguages as unknown[])?.length) {
    raw.learningLanguages = (
      raw.learningLanguages as { code: string; level: string }[]
    ).map((l) => ({ ...l, level: migrateLegacyLevel(l.level) }))
  }
  return raw
}

/**
 * The current user's profile, with legacy language shapes migrated.
 *
 * Extracted from GET /api/user/me so server components can read the same data
 * directly instead of the browser fetching it after first paint. The route and
 * every server caller now share one definition of "the user's profile".
 */
export async function getUserProfileData(
  userId: string,
): Promise<Record<string, unknown> | null> {
  await connectDB()
  const user = await User.findById(userId).select('-passwordHash').lean()
  if (!user) return null

  const raw = user as Record<string, unknown>
  const profile = resolveLanguageProfile(raw)
  if (isLanguageProfileComplete(profile)) {
    raw.languageProfile = profile
    if (!(user as { languageProfile?: unknown }).languageProfile) {
      const update = buildLanguageProfileUpdate(
        profile,
        (raw.spokenLanguages as { code: string; level: string }[]) ?? [],
        profile.completedAt,
      )
      await User.updateOne({ _id: userId, languageProfile: null }, { $set: update })
    }
  }

  return applyProfileMigrations(raw)
}

/**
 * Serialises to something a Client Component can receive as a prop. Mongo
 * documents carry ObjectIds and Dates, which cannot cross that boundary.
 */
export function toPlainProfile(
  raw: Record<string, unknown> | null,
): Record<string, unknown> | null {
  return raw ? (JSON.parse(JSON.stringify(raw)) as Record<string, unknown>) : null
}
