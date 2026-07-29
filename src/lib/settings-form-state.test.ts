import { describe, it, expect } from 'vitest'
import { buildSettingsFormState, EMPTY_SETTINGS_FORM_STATE } from './settings-form-state'

describe('buildSettingsFormState', () => {
  it('returns empty values when there is no user document', () => {
    expect(buildSettingsFormState(null)).toEqual(EMPTY_SETTINGS_FORM_STATE)
  })

  it('reads the current language profile shape', () => {
    const state = buildSettingsFormState({
      displayName: 'Ana Ruiz',
      username: 'ana',
      email: 'ana@example.com',
      avatar: 'https://cdn.example/a.png',
      languageProfile: {
        nativeLanguages: ['es', 'ca'],
        learningLanguages: [
          { code: 'en', level: 'b1', isPrimary: true },
          { code: 'de', level: 'a2', isPrimary: false },
        ],
        preferredExplanationLanguage: 'ca',
      },
    })

    expect(state.spoken).toEqual([
      { code: 'es', level: 'native' },
      { code: 'ca', level: 'native' },
    ])
    expect(state.learning).toEqual([
      { code: 'en', level: 'b1' },
      { code: 'de', level: 'a2' },
    ])
    expect(state.explanationLanguage).toBe('ca')
    expect(state.displayName).toBe('Ana Ruiz')
    expect(state.email).toBe('ana@example.com')
    expect(state.avatarUrl).toBe('https://cdn.example/a.png')
  })

  it('drops isPrimary, which the picker does not carry', () => {
    const state = buildSettingsFormState({
      languageProfile: {
        nativeLanguages: ['es'],
        learningLanguages: [{ code: 'en', level: 'b1', isPrimary: true }],
        preferredExplanationLanguage: 'es',
      },
    })

    expect(state.learning[0]).not.toHaveProperty('isPrimary')
  })

  // Accounts predating languageProfile still hold the old fields, and reading
  // only the new shape emptied the Languages tab for them.
  it('falls back to the legacy spoken and learning languages', () => {
    const state = buildSettingsFormState({
      spokenLanguages: [
        { code: 'fr', level: 'native' },
        { code: 'en', level: 'other' },
      ],
      learningLanguages: [{ code: 'ja', level: 'a1' }],
    })

    expect(state.spoken).toEqual([{ code: 'fr', level: 'native' }])
    expect(state.learning).toEqual([{ code: 'ja', level: 'a1' }])
  })

  it('falls back to the first native language when none was chosen', () => {
    const state = buildSettingsFormState({
      spokenLanguages: [{ code: 'fr', level: 'native' }],
    })

    expect(state.explanationLanguage).toBe('fr')
  })

  it('leaves the explanation language empty when nothing is known', () => {
    expect(buildSettingsFormState({}).explanationLanguage).toBe('')
  })

  it('flattens interest categories into a single tag list', () => {
    const state = buildSettingsFormState({
      interests: { music: ['jazz', 'rock'], sport: ['climbing'] },
    })

    expect(state.interestTags).toEqual(['jazz', 'rock', 'climbing'])
  })
})
