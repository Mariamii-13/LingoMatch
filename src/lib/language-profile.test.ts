import { describe, expect, it } from 'vitest'
import {
  buildLanguageProfileUpdate,
  isLanguageProfileComplete,
  resolveLanguageProfile,
} from './language-profile'

describe('resolveLanguageProfile', () => {
  it('normalizes a canonical multilingual profile', () => {
    const profile = resolveLanguageProfile({
      languageProfile: {
        version: 1,
        nativeLanguages: ['EN', 'ka', 'en'],
        learningLanguages: [
          { code: 'ES', level: 'B1', isPrimary: true },
          { code: 'de', level: 'beginner', isPrimary: false },
        ],
        preferredExplanationLanguage: 'EN',
        completedAt: new Date('2026-07-28T00:00:00.000Z'),
      },
    })

    expect(profile).toMatchObject({
      version: 1,
      nativeLanguages: ['en', 'ka'],
      learningLanguages: [
        { code: 'es', level: 'b1', isPrimary: true },
        { code: 'de', level: 'unsure', isPrimary: false },
      ],
      preferredExplanationLanguage: 'en',
    })
  })

  it('derives a complete profile from legacy language fields', () => {
    const profile = resolveLanguageProfile(
      {
        nativeLanguages: ['en'],
        spokenLanguages: [
          { code: 'en', level: 'native' },
          { code: 'fr', level: 'other' },
        ],
        learningLanguages: [
          { code: 'es', level: 'Intermediate' },
          { code: 'de', level: 'Beginner' },
        ],
      },
      new Date('2026-07-28T00:00:00.000Z'),
    )

    expect(profile).toEqual({
      version: 1,
      nativeLanguages: ['en'],
      learningLanguages: [
        { code: 'es', level: 'b1', isPrimary: true },
        { code: 'de', level: 'unsure', isPrimary: false },
      ],
      preferredExplanationLanguage: 'en',
      completedAt: new Date('2026-07-28T00:00:00.000Z'),
    })
    expect(isLanguageProfileComplete(profile)).toBe(true)
  })

  it('does not consider an overlapping native and target language complete', () => {
    const profile = resolveLanguageProfile({
      nativeLanguages: ['en'],
      learningLanguages: [{ code: 'en', level: 'b1' }],
    })

    expect(isLanguageProfileComplete(profile)).toBe(false)
  })
})

describe('buildLanguageProfileUpdate', () => {
  it('writes canonical and compatibility fields without deleting other spoken languages', () => {
    const update = buildLanguageProfileUpdate(
      {
        nativeLanguages: ['en', 'ka'],
        learningLanguages: [
          { code: 'es', level: 'b1', isPrimary: true },
          { code: 'de', level: 'unsure', isPrimary: false },
        ],
        preferredExplanationLanguage: 'ka',
      },
      [{ code: 'fr', level: 'other' }],
      new Date('2026-07-28T00:00:00.000Z'),
    )

    expect(update.languageProfile).toMatchObject({
      version: 1,
      nativeLanguages: ['en', 'ka'],
      preferredExplanationLanguage: 'ka',
    })
    expect(update.nativeLanguages).toEqual(['en', 'ka'])
    expect(update.spokenLanguages).toEqual([
      { code: 'en', level: 'native' },
      { code: 'ka', level: 'native' },
      { code: 'fr', level: 'other' },
    ])
    expect(update.learningLanguages).toEqual([
      { code: 'es', level: 'b1' },
      { code: 'de', level: 'unsure' },
    ])
  })

  it('removes former native languages from compatibility fields', () => {
    const update = buildLanguageProfileUpdate(
      {
        nativeLanguages: ['ka'],
        learningLanguages: [{ code: 'es', level: 'a2', isPrimary: true }],
        preferredExplanationLanguage: 'ka',
      },
      [
        { code: 'en', level: 'native' },
        { code: 'ka', level: 'native' },
      ],
    )

    expect(update.spokenLanguages).toEqual([{ code: 'ka', level: 'native' }])
  })

  it('removes a spoken language when it becomes a learning target', () => {
    const update = buildLanguageProfileUpdate(
      {
        nativeLanguages: ['en'],
        learningLanguages: [{ code: 'fr', level: 'b1', isPrimary: true }],
        preferredExplanationLanguage: 'en',
      },
      [
        { code: 'en', level: 'native' },
        { code: 'fr', level: 'other' },
      ],
    )

    expect(update.spokenLanguages).toEqual([{ code: 'en', level: 'native' }])
    expect(update.learningLanguages).toEqual([{ code: 'fr', level: 'b1' }])
  })
})
