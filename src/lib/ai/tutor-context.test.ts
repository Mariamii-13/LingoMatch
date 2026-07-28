import { describe, expect, it } from 'vitest'
import { buildTutorContext } from './tutor-context'

const profile = {
  version: 1 as const,
  nativeLanguages: ['en', 'ka'],
  learningLanguages: [
    { code: 'es', level: 'b1' as const, isPrimary: true },
    { code: 'de', level: 'unsure' as const, isPrimary: false },
  ],
  preferredExplanationLanguage: 'ka',
  completedAt: new Date('2026-07-28T00:00:00.000Z'),
}

describe('buildTutorContext', () => {
  it('resolves names and CEFR level from the saved profile', () => {
    expect(buildTutorContext(profile, 'es')).toEqual({
      targetLanguage: 'Spanish',
      nativeLanguages: ['English', 'Georgian'],
      explanationLanguage: 'Georgian',
      level: 'B1',
    })
  })

  it('preserves an unsure level and rejects targets outside the profile', () => {
    expect(buildTutorContext(profile, 'de')).toMatchObject({
      targetLanguage: 'German',
      level: 'unsure',
    })
    expect(buildTutorContext(profile, 'fr')).toBeNull()
  })
})
