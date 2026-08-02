import 'server-only'
import { avatarGradient } from '@/lib/utils'
import { getLanguage, migrateLegacyLevel, formatLevel } from '@/constants/languages'

/**
 * Shapes a raw `User` document into the partner payload the match UI
 * expects. Pulled out of the chat match route so `pending-matches.server.ts`
 * (roadmap #32's dashboard card) can build the same shape for a partner who
 * matched asynchronously, without duplicating the language/level mapping.
 */
export function buildMatchPartner(doc: Record<string, unknown>) {
  const name = (doc.displayName as string) ?? 'Partner'
  const username = (doc.username as string) ?? ''
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const spokenItems = (doc.spokenLanguages as { code: string; level: string }[] | undefined) ?? []
  const nativeCodes = (doc.nativeLanguages as string[]) ?? []
  const spoken = spokenItems.length
    ? spokenItems
    : nativeCodes.map((code) => ({ code, level: 'native' }))

  const learningItems = (doc.learningLanguages as { code: string; level: string }[]) ?? []

  return {
    id: (doc._id as { toString(): string }).toString(),
    name,
    username,
    country: (doc.country as string) ?? '',
    flag: '',
    avatarInitials: initials,
    avatarColor: avatarGradient(username),
    native: spoken.map(({ code, level }) => {
      const l = getLanguage(code)
      return { code: l.code, name: l.name, flag: l.flag, level: formatLevel(level) }
    }),
    learning: learningItems.map(({ code, level }) => {
      const l = getLanguage(code)
      return { code: l.code, name: l.name, flag: l.flag, level: formatLevel(migrateLegacyLevel(level)) }
    }),
    interests: [],
  }
}

export const MATCH_PARTNER_SELECT =
  'displayName username avatar country nativeLanguages spokenLanguages learningLanguages'
