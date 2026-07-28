import { describe, expect, it } from 'vitest'
import { languageProfileInputSchema } from './language-profile'

const valid = {
  nativeLanguages: ['en'],
  learningLanguages: [{ code: 'es', level: 'b1', isPrimary: true }],
  preferredExplanationLanguage: 'en',
}

describe('languageProfileInputSchema', () => {
  it('accepts a valid multilingual profile and unsure level', () => {
    const result = languageProfileInputSchema.safeParse({
      ...valid,
      nativeLanguages: ['en', 'ka'],
      learningLanguages: [
        { code: 'es', level: 'b1', isPrimary: true },
        { code: 'de', level: 'unsure', isPrimary: false },
      ],
      preferredExplanationLanguage: 'ka',
    })
    expect(result.success).toBe(true)
  })

  it('rejects unsupported and duplicate language codes', () => {
    expect(languageProfileInputSchema.safeParse({ ...valid, nativeLanguages: ['xx'] }).success)
      .toBe(false)
    expect(languageProfileInputSchema.safeParse({ ...valid, nativeLanguages: ['en', 'EN'] }).success)
      .toBe(false)
  })

  it('rejects overlap between native and target languages', () => {
    const result = languageProfileInputSchema.safeParse({
      ...valid,
      learningLanguages: [{ code: 'en', level: 'b1', isPrimary: true }],
    })
    expect(result.success).toBe(false)
  })

  it('requires exactly one primary target', () => {
    const none = languageProfileInputSchema.safeParse({
      ...valid,
      learningLanguages: [{ code: 'es', level: 'b1', isPrimary: false }],
    })
    const two = languageProfileInputSchema.safeParse({
      ...valid,
      learningLanguages: [
        { code: 'es', level: 'b1', isPrimary: true },
        { code: 'de', level: 'a2', isPrimary: true },
      ],
    })
    expect(none.success).toBe(false)
    expect(two.success).toBe(false)
  })

  it('requires the explanation language to be native', () => {
    const result = languageProfileInputSchema.safeParse({
      ...valid,
      preferredExplanationLanguage: 'ka',
    })
    expect(result.success).toBe(false)
  })
})
