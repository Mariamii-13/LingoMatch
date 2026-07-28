import { describe, it, expect } from 'vitest'
import { matchRequestSchema } from './match'

function parse(input: unknown) {
  return matchRequestSchema.safeParse(input)
}

describe('matchRequestSchema', () => {
  it('accepts a valid request', () => {
    const result = parse({ targetLanguage: 'es', nativeLanguage: 'en' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toMatchObject({
        targetLanguage: 'es',
        nativeLanguage: 'en',
        interests: [],
        countryPreference: '',
      })
    }
  })

  // The bug this schema exists to kill: reciprocal partners failed to match
  // because one side sent "EN" and the other "en".
  it('normalises uppercase codes to the canonical lowercase form', () => {
    const result = parse({ targetLanguage: 'ES', nativeLanguage: 'EN' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.targetLanguage).toBe('es')
      expect(result.data.nativeLanguage).toBe('en')
    }
  })

  it('normalises mixed case and surrounding whitespace', () => {
    const result = parse({ targetLanguage: '  Es ', nativeLanguage: 'eN' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.targetLanguage).toBe('es')
      expect(result.data.nativeLanguage).toBe('en')
    }
  })

  it('produces identical output for every casing of the same pair', () => {
    const variants = [
      { targetLanguage: 'es', nativeLanguage: 'en' },
      { targetLanguage: 'ES', nativeLanguage: 'EN' },
      { targetLanguage: 'Es', nativeLanguage: 'eN' },
    ].map((input) => {
      const result = parse(input)
      return result.success ? result.data : null
    })

    expect(variants[0]).not.toBeNull()
    for (const variant of variants) {
      expect(variant?.targetLanguage).toBe('es')
      expect(variant?.nativeLanguage).toBe('en')
    }
  })

  it('preserves multi-part codes such as zh-tw', () => {
    const result = parse({ targetLanguage: 'ZH-TW', nativeLanguage: 'en' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.targetLanguage).toBe('zh-tw')
  })

  it('rejects an unsupported language', () => {
    expect(parse({ targetLanguage: 'klingon', nativeLanguage: 'en' }).success).toBe(false)
  })

  it('rejects a missing language', () => {
    expect(parse({ nativeLanguage: 'en' }).success).toBe(false)
    expect(parse({ targetLanguage: '', nativeLanguage: 'en' }).success).toBe(false)
  })

  it('explains a missing language in plain language, not Zod internals', () => {
    const result = parse({ nativeLanguage: 'en' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? ''
      expect(message).toBe('Please choose both languages')
      expect(message).not.toMatch(/expected|received|undefined/i)
    }
  })

  it('rejects practising a language you already speak natively', () => {
    expect(parse({ targetLanguage: 'en', nativeLanguage: 'en' }).success).toBe(false)
    // Casing must not be a way to sneak past that check.
    expect(parse({ targetLanguage: 'EN', nativeLanguage: 'en' }).success).toBe(false)
  })

  it('defaults interests and country preference when omitted', () => {
    const result = parse({ targetLanguage: 'es', nativeLanguage: 'en' })
    if (result.success) {
      expect(result.data.interests).toEqual([])
      expect(result.data.countryPreference).toBe('')
    }
  })

  it('rejects an oversized interest list', () => {
    const interests = Array.from({ length: 25 }, (_, i) => `interest-${i}`)
    expect(parse({ targetLanguage: 'es', nativeLanguage: 'en', interests }).success).toBe(false)
  })

  it('rejects an overlong country preference', () => {
    const countryPreference = 'x'.repeat(100)
    expect(parse({ targetLanguage: 'es', nativeLanguage: 'en', countryPreference }).success).toBe(
      false,
    )
  })
})
