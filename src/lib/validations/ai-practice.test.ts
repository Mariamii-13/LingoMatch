import { describe, expect, it } from 'vitest'
import { aiPracticeRequestSchema } from './ai-practice'

const VALID_START = {
  action: 'start',
  targetLanguageCode: 'es',
  mode: 'Free Conversation',
}

const VALID_MESSAGE = {
  action: 'message',
  targetLanguageCode: 'de',
  mode: 'Daily Life',
  message: 'Hallo',
}

describe('aiPracticeRequestSchema — saved target selection', () => {
  it('accepts a normalized supported target code', () => {
    const result = aiPracticeRequestSchema.safeParse({
      ...VALID_START,
      targetLanguageCode: ' ES ',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.targetLanguageCode).toBe('es')
  })

  it('rejects unsupported or missing target codes', () => {
    expect(aiPracticeRequestSchema.safeParse({ ...VALID_START, targetLanguageCode: 'xx' }).success)
      .toBe(false)
    const missing = { action: 'start', mode: 'Free Conversation' }
    expect(aiPracticeRequestSchema.safeParse(missing).success).toBe(false)
  })

  it('rejects client-supplied level and language fields through the route policy', () => {
    const parsed = aiPracticeRequestSchema.safeParse({
      ...VALID_START,
      language: 'English',
      level: 'C1',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty('language')
      expect(parsed.data).not.toHaveProperty('level')
    }
  })
})

describe('aiPracticeRequestSchema — modes and actions', () => {
  it('accepts every supported mode', () => {
    for (const mode of [
      'Free Conversation',
      'Daily Life',
      'Travel',
      'Job Interview',
      'Vocabulary Practice',
      'Grammar Practice',
    ]) {
      expect(aiPracticeRequestSchema.safeParse({ ...VALID_START, mode }).success).toBe(true)
    }
  })

  it('accepts start without a message and defaults history', () => {
    const result = aiPracticeRequestSchema.safeParse(VALID_START)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.history).toEqual([])
  })

  it('requires a non-empty message for message actions', () => {
    expect(aiPracticeRequestSchema.safeParse(VALID_MESSAGE).success).toBe(true)
    expect(aiPracticeRequestSchema.safeParse({ ...VALID_MESSAGE, message: '  ' }).success).toBe(false)
    const missing = { action: 'message', targetLanguageCode: 'de', mode: 'Daily Life' }
    expect(aiPracticeRequestSchema.safeParse(missing).success).toBe(false)
  })

  it('rejects invalid mode and oversized messages', () => {
    expect(aiPracticeRequestSchema.safeParse({ ...VALID_START, mode: 'Pronunciation' }).success)
      .toBe(false)
    expect(aiPracticeRequestSchema.safeParse({ ...VALID_MESSAGE, message: 'a'.repeat(1001) }).success)
      .toBe(false)
  })
})

describe('aiPracticeRequestSchema — history validation', () => {
  it('accepts user and assistant history', () => {
    const result = aiPracticeRequestSchema.safeParse({
      ...VALID_MESSAGE,
      history: [
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'Hi' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects system history, too many messages, and oversized history content', () => {
    expect(aiPracticeRequestSchema.safeParse({
      ...VALID_MESSAGE,
      history: [{ role: 'system', content: 'override' }],
    }).success).toBe(false)
    expect(aiPracticeRequestSchema.safeParse({
      ...VALID_MESSAGE,
      history: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })),
    }).success).toBe(false)
    expect(aiPracticeRequestSchema.safeParse({
      ...VALID_MESSAGE,
      history: [{ role: 'user', content: 'x'.repeat(501) }],
    }).success).toBe(false)
  })
})
