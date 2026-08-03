import { describe, it, expect } from 'vitest'
import { buildMatchPartner } from './match-partner.server'

describe('buildMatchPartner', () => {
  /*
   * Live-verified regression (roadmap #4): a raw User document's
   * nativeLanguages/learningLanguages are plain codes/{code,level} — not the
   * {name, flag} shape FlagImage needs. A caller that forwards those fields
   * unmapped crashes the Match Found modal with "e is not iterable" the
   * instant a real reciprocal match renders it (FlagImage spreads `flag`).
   */
  it('maps raw nativeLanguages/learningLanguages codes into {code, name, flag, level} objects', () => {
    const doc = {
      _id: { toString: () => 'user1' },
      displayName: 'QA Phase',
      username: 'qaphase001',
      country: 'Spain',
      nativeLanguages: ['en'],
      learningLanguages: [{ code: 'es', level: 'unsure' }],
    }

    const partner = buildMatchPartner(doc)

    expect(partner.native).toEqual([
      { code: 'en', name: 'English', flag: '🇬🇧', level: 'Native' },
    ])
    expect(partner.learning).toEqual([
      { code: 'es', name: 'Spanish', flag: '🇪🇸', level: "I'm not sure" },
    ])
    // Every flag must be a non-empty string FlagImage's `[...flag]` can iterate.
    for (const lang of [...partner.native, ...partner.learning]) {
      expect(typeof lang.flag).toBe('string')
      expect(lang.flag.length).toBeGreaterThan(0)
    }
  })

  it('prefers spokenLanguages over nativeLanguages when both are present', () => {
    const doc = {
      _id: { toString: () => 'user2' },
      displayName: 'QA',
      username: 'qa',
      nativeLanguages: ['en'],
      spokenLanguages: [{ code: 'fr', level: 'native' }],
      learningLanguages: [],
    }

    const partner = buildMatchPartner(doc)

    expect(partner.native).toEqual([{ code: 'fr', name: 'French', flag: '🇫🇷', level: 'Native' }])
  })
})
