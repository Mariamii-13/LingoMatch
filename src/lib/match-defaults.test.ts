import { describe, it, expect } from 'vitest'
import { resolveMatchDefaults } from './match-defaults'
import type { LanguageProfile } from '@/lib/language-profile'

function profile(overrides: Partial<LanguageProfile> = {}): LanguageProfile {
  return {
    nativeLanguages: ['en'],
    learningLanguages: [{ code: 'es', level: 'b1', isPrimary: true }],
    preferredExplanationLanguage: 'en',
    ...overrides,
  } as LanguageProfile
}

describe('resolveMatchDefaults', () => {
  it('uses the primary learning language as the target', () => {
    expect(resolveMatchDefaults(profile())).toEqual({
      targetLanguage: 'es',
      nativeLanguage: 'en',
    })
  })

  it('prefers the language flagged primary over list order', () => {
    const result = resolveMatchDefaults(
      profile({
        learningLanguages: [
          { code: 'de', level: 'a1', isPrimary: false },
          { code: 'ja', level: 'a2', isPrimary: true },
        ],
      }),
    )
    expect(result.targetLanguage).toBe('ja')
  })

  it('falls back to the first learning language when none is primary', () => {
    const result = resolveMatchDefaults(
      profile({
        learningLanguages: [
          { code: 'de', level: 'a1', isPrimary: false },
          { code: 'ja', level: 'a2', isPrimary: false },
        ],
      }),
    )
    expect(result.targetLanguage).toBe('de')
  })

  it('uses the first native language', () => {
    const result = resolveMatchDefaults(profile({ nativeLanguages: ['fr', 'en'] }))
    expect(result.nativeLanguage).toBe('fr')
  })

  it('returns empty strings for a missing profile so the form asks rather than guesses', () => {
    expect(resolveMatchDefaults(null)).toEqual({ targetLanguage: '', nativeLanguage: '' })
  })

  it('returns empty strings when the profile has no languages yet', () => {
    const result = resolveMatchDefaults(
      profile({ nativeLanguages: [], learningLanguages: [] }),
    )
    expect(result).toEqual({ targetLanguage: '', nativeLanguage: '' })
  })

  // Nothing here may reintroduce the uppercase codes that broke matching.
  it('never returns an uppercase code', () => {
    const result = resolveMatchDefaults(profile())
    expect(result.targetLanguage).toBe(result.targetLanguage.toLowerCase())
    expect(result.nativeLanguage).toBe(result.nativeLanguage.toLowerCase())
  })
})
