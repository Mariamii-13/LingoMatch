import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  looksLikeStructuredJson,
  extractConversationSoFar,
  parseStructuredReply,
  formatStructuredTail,
  formatStructuredReply,
  explanationLanguageMismatch,
  repairTranslation,
  streamStructuredTutorReply,
  type StructuredTutorReply,
} from './structured-tutor-reply'

vi.mock('./openrouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./openrouter')>()
  return { ...actual, streamTutor: vi.fn() }
})
import { streamTutor } from './openrouter'

const BASE_REQ = {
  targetLanguage: 'Spanish',
  nativeLanguages: ['English'],
  explanationLanguage: 'English',
  level: 'B1' as const,
  mode: 'Free Conversation' as const,
  history: [] as { role: 'user' | 'assistant'; content: string }[],
}

async function* gen(chunks: string[]) {
  for (const chunk of chunks) yield chunk
}

async function collect(g: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = []
  for await (const chunk of g) out.push(chunk)
  return out
}

describe('looksLikeStructuredJson', () => {
  it('is true for text starting with an object', () => {
    expect(looksLikeStructuredJson('{"conversation":')).toBe(true)
    expect(looksLikeStructuredJson('  {"conversation":')).toBe(true)
  })

  it('is false for plain prose', () => {
    expect(looksLikeStructuredJson('Hola, ¿qué tal?')).toBe(false)
    expect(looksLikeStructuredJson('')).toBe(false)
  })
})

describe('extractConversationSoFar', () => {
  it('returns empty before the key has arrived', () => {
    expect(extractConversationSoFar('{"conv')).toBe('')
  })

  it('returns empty while still inside the key/colon/quote preamble', () => {
    expect(extractConversationSoFar('{"conversation"')).toBe('')
    expect(extractConversationSoFar('{"conversation":')).toBe('')
    expect(extractConversationSoFar('{"conversation": ')).toBe('')
  })

  it('extracts the in-progress value before the closing quote arrives', () => {
    expect(extractConversationSoFar('{"conversation": "Hola, ¿q')).toBe('Hola, ¿q')
  })

  it('stops exactly at an unescaped closing quote', () => {
    expect(
      extractConversationSoFar('{"conversation": "Hola", "correction": null}'),
    ).toBe('Hola')
  })

  it('grows monotonically as more of the buffer arrives, simulating chunk-by-chunk streaming', () => {
    const full = '{"conversation": "Buenos días, ¿cómo estás?", "correction": null}'
    let seenSoFar = ''
    for (let end = 1; end <= full.length; end++) {
      const soFar = extractConversationSoFar(full.slice(0, end))
      expect(soFar.length).toBeGreaterThanOrEqual(seenSoFar.length)
      expect(soFar.startsWith(seenSoFar)).toBe(true)
      seenSoFar = soFar
    }
    expect(seenSoFar).toBe('Buenos días, ¿cómo estás?')
  })

  it('decodes an escaped quote inside the string', () => {
    expect(extractConversationSoFar('{"conversation": "She said \\"hola\\""}')).toBe(
      'She said "hola"',
    )
  })

  it('decodes escaped backslash, newline, tab', () => {
    expect(extractConversationSoFar('{"conversation": "a\\\\b\\nc\\td"}')).toBe('a\\b\nc\td')
  })

  it('decodes a unicode escape once it is fully buffered', () => {
    expect(extractConversationSoFar('{"conversation": "caf\\u00e9"}')).toBe('café')
  })

  it('does not emit a dangling partial escape sequence at the buffer boundary', () => {
    // Buffer cuts off right after the backslash — the escape target is unknown yet.
    const partial = extractConversationSoFar('{"conversation": "café is \\')
    expect(partial).toBe('café is ')
    // Once the rest arrives, re-scanning the fuller buffer resolves it correctly.
    const full = extractConversationSoFar('{"conversation": "café is \\ngreat"}')
    expect(full).toBe('café is \ngreat')
  })

  it('does not emit a dangling partial unicode escape at the buffer boundary', () => {
    const partial = extractConversationSoFar('{"conversation": "caf\\u00')
    expect(partial).toBe('caf')
  })
})

describe('parseStructuredReply', () => {
  const VALID = JSON.stringify({
    conversation: 'Hola, ¿qué tal?',
    correction: 'Fui al mercado.',
    explanation: 'Use the preterite for a finished past action.',
    explanation_language: 'English',
    practice: 'Try using "fui" in your own sentence.',
  })

  it('parses a fully valid structured reply', () => {
    const parsed = parseStructuredReply(VALID)
    expect(parsed).toMatchObject({
      conversation: 'Hola, ¿qué tal?',
      correction: 'Fui al mercado.',
      explanation: 'Use the preterite for a finished past action.',
      explanation_language: 'English',
      practice: 'Try using "fui" in your own sentence.',
    })
  })

  it('normalises null/empty optional fields to null', () => {
    const parsed = parseStructuredReply(
      JSON.stringify({ conversation: 'Hola', correction: null, explanation: '  ', practice: undefined }),
    )
    expect(parsed).toMatchObject({
      conversation: 'Hola',
      correction: null,
      explanation: null,
      practice: null,
    })
  })

  it('returns null for invalid JSON', () => {
    expect(parseStructuredReply('{"conversation": "Hola"')).toBeNull()
  })

  it('returns null when conversation is missing or empty', () => {
    expect(parseStructuredReply('{"correction": null}')).toBeNull()
    expect(parseStructuredReply('{"conversation": "   "}')).toBeNull()
  })

  it('returns null for a JSON array or primitive instead of an object', () => {
    expect(parseStructuredReply('[1,2,3]')).toBeNull()
    expect(parseStructuredReply('"just a string"')).toBeNull()
  })
})

describe('formatStructuredTail / formatStructuredReply', () => {
  it('joins non-null parts with a single space and trims', () => {
    expect(
      formatStructuredTail({ correction: 'Fui al mercado.', explanation: 'Past tense.', practice: 'Try it.' }),
    ).toBe('Fui al mercado. Past tense. Try it.')
  })

  it('omits null parts without leaving extra whitespace', () => {
    expect(formatStructuredTail({ correction: null, explanation: null, practice: 'Try it.' })).toBe(
      'Try it.',
    )
    expect(formatStructuredTail({ correction: null, explanation: null, practice: null })).toBe('')
  })

  it('formatStructuredReply prefixes the conversation field and skips the space when the tail is empty', () => {
    const noTail: StructuredTutorReply = {
      conversation: 'Hola',
      correction: null,
      explanation: null,
      explanation_language: null,
      practice: null,
      skill_tag: null,
    }
    expect(formatStructuredReply(noTail)).toBe('Hola')

    const withTail: StructuredTutorReply = {
      ...noTail,
      correction: 'Corrected.',
      practice: 'Try again.',
    }
    expect(formatStructuredReply(withTail)).toBe('Hola Corrected. Try again.')
  })
})

describe('explanationLanguageMismatch', () => {
  it('is false when explanation is null', () => {
    expect(explanationLanguageMismatch(null, 'English')).toBe(false)
  })

  it('is false when the expected language is outside the tested Tier-1 set', () => {
    expect(explanationLanguageMismatch('Some text here in any language.', 'Japanese')).toBe(false)
  })

  it('detects a Spanish explanation when English was expected', () => {
    expect(
      explanationLanguageMismatch(
        'Aquí necesitas el pasado porque la acción ya terminó, no el presente.',
        'English',
      ),
    ).toBe(true)
  })

  it('does not flag an English explanation when English was expected', () => {
    expect(
      explanationLanguageMismatch(
        'You need the past tense here because the action is already finished.',
        'English',
      ),
    ).toBe(false)
  })

  it('detects an English explanation when Spanish was expected', () => {
    expect(
      explanationLanguageMismatch(
        'You need the past tense here because the action is already finished.',
        'Spanish',
      ),
    ).toBe(true)
  })

  it('does not flag a Portuguese explanation when Portuguese was expected', () => {
    expect(
      explanationLanguageMismatch(
        'Você precisa usar o pretérito porque a ação já terminou no passado.',
        'Portuguese',
      ),
    ).toBe(false)
  })

  it('fails safe (no repair) on very short, inconclusive text', () => {
    expect(explanationLanguageMismatch('Sí.', 'English')).toBe(false)
  })

  // Live-diagnosed regression, 2026-08-01: a real call with target=French,
  // explanation-language=Spanish produced this exact French sentence in the
  // "explanation" field. An earlier version of this validator restricted
  // franc's candidate set to only the 3 explanation languages, so French
  // text was force-classified as its trigram-nearest explanation language
  // (Spanish) and the mismatch was missed. Tier-1 target languages must be
  // in the candidate set too, or the #1 diagnosed failure mode (explaining
  // in the target language instead of the learner's own) goes undetected.
  it('detects a French explanation (the target language) leaking in when Spanish was expected', () => {
    expect(
      explanationLanguageMismatch(
        "Après l'auxiliaire avoir, le participe passé de acheter termine en é.",
        'Spanish',
      ),
    ).toBe(true)
  })

  it('does not flag a French explanation when French was actually expected', () => {
    expect(
      explanationLanguageMismatch(
        "Après l'auxiliaire avoir, le participe passé de acheter termine en é.",
        'French',
      ),
    ).toBe(false)
  })
})

describe('repairTranslation', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.OPENROUTER_API_KEY
  })

  it('returns the translated text on success', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({ choices: [{ message: { content: '  Translated sentence.  ' } }] }),
        { status: 200 },
      ),
    )
    const result = await repairTranslation('Frase original.', 'English', 'some/model')
    expect(result).toBe('Translated sentence.')
  })

  it('sends the text and target language in the request', async () => {
    const spy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }),
      )
    await repairTranslation('Frase original.', 'English', 'some/model')
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe('some/model')
    expect(body.messages[1]).toMatchObject({ role: 'user', content: 'Frase original.' })
    expect(body.messages[0].content).toContain('English')
  })

  it('returns null without an API key', async () => {
    delete process.env.OPENROUTER_API_KEY
    const spy = vi.spyOn(global, 'fetch')
    expect(await repairTranslation('x', 'English', 'some/model')).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('returns null without a model id', async () => {
    const spy = vi.spyOn(global, 'fetch')
    expect(await repairTranslation('x', 'English', undefined)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('returns null on a non-ok response rather than throwing', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('', { status: 500 }))
    expect(await repairTranslation('x', 'English', 'some/model')).toBeNull()
  })

  it('returns null on malformed JSON rather than throwing', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('not json', { status: 200 }))
    expect(await repairTranslation('x', 'English', 'some/model')).toBeNull()
  })

  it('returns null on a network error rather than throwing', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'))
    expect(await repairTranslation('x', 'English', 'some/model')).toBeNull()
  })
})

describe('streamStructuredTutorReply', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key'
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.OPENROUTER_API_KEY
  })

  it('streams the conversation field incrementally, then appends the tail once parsed', async () => {
    const json = JSON.stringify({
      conversation: 'Hola, ¿qué tal?',
      correction: 'Fui al mercado.',
      explanation: 'Use the past tense here.',
      explanation_language: 'English',
      practice: 'Try it yourself.',
    })
    // Split into several small chunks to exercise the incremental extractor.
    const chunkSize = 7
    const chunks: string[] = []
    for (let i = 0; i < json.length; i += chunkSize) chunks.push(json.slice(i, i + chunkSize))

    vi.mocked(streamTutor).mockReturnValue(gen(chunks))

    const deltas = await collect(
      streamStructuredTutorReply(BASE_REQ, { explanationLanguageName: 'English' }),
    )
    const full = deltas.join('')
    expect(full).toBe(
      'Hola, ¿qué tal? Fui al mercado. Use the past tense here. Try it yourself.',
    )
    // The conversation text must have arrived before the final tail chunk —
    // i.e. more than one delta was yielded, not one big buffered blob.
    expect(deltas.length).toBeGreaterThan(1)
  })

  it('falls back to plain pass-through when the model ignores the JSON instruction', async () => {
    vi.mocked(streamTutor).mockReturnValue(gen(['Hola', ', ', '¿qué tal?']))
    const deltas = await collect(
      streamStructuredTutorReply(BASE_REQ, { explanationLanguageName: 'English' }),
    )
    expect(deltas).toEqual(['Hola', ', ', '¿qué tal?'])
  })

  it('shows the best-effort extracted text rather than nothing when JSON is truncated mid-stream', async () => {
    vi.mocked(streamTutor).mockReturnValue(gen(['{"conversation": "Hola, todo bi']))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const deltas = await collect(
      streamStructuredTutorReply(BASE_REQ, { explanationLanguageName: 'English' }),
    )
    expect(deltas.join('')).toBe('Hola, todo bi')
  })

  it('falls back to the raw buffer when even the conversation field never resolves', async () => {
    vi.mocked(streamTutor).mockReturnValue(gen(['{"conv']))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const deltas = await collect(
      streamStructuredTutorReply(BASE_REQ, { explanationLanguageName: 'English' }),
    )
    expect(deltas.join('')).toBe('{"conv')
  })

  it('repairs a wrong-language explanation before appending the tail', async () => {
    const json = JSON.stringify({
      conversation: 'Hola',
      correction: 'Fui al mercado.',
      // Wrong language on purpose: Spanish explanation when English was expected.
      explanation: 'Aquí necesitas el pretérito porque la acción ya terminó completamente.',
      explanation_language: 'Spanish',
      practice: 'Try it.',
    })
    vi.mocked(streamTutor).mockReturnValue(gen([json]))
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'You need the preterite because the action is finished.' } }],
        }),
        { status: 200 },
      ),
    )

    const deltas = await collect(
      streamStructuredTutorReply(BASE_REQ, {
        explanationLanguageName: 'English',
        repairModelId: 'some/model',
      }),
    )
    const full = deltas.join('')
    expect(full).toContain('You need the preterite because the action is finished.')
    expect(full).not.toContain('Aquí necesitas')
  })

  it('keeps the original explanation when the repair call itself fails', async () => {
    const json = JSON.stringify({
      conversation: 'Hola',
      correction: null,
      explanation: 'Aquí necesitas el pretérito porque la acción ya terminó completamente.',
      explanation_language: 'Spanish',
      practice: 'Try it.',
    })
    vi.mocked(streamTutor).mockReturnValue(gen([json]))
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('', { status: 500 }))

    const deltas = await collect(
      streamStructuredTutorReply(BASE_REQ, {
        explanationLanguageName: 'English',
        repairModelId: 'some/model',
      }),
    )
    expect(deltas.join('')).toContain('Aquí necesitas el pretérito')
  })

  it('invokes onParsed with the final structured reply, including skill_tag, before yielding the tail', async () => {
    const json = JSON.stringify({
      conversation: 'Hola',
      correction: 'Fui al mercado.',
      explanation: 'Use the past tense here.',
      explanation_language: 'English',
      practice: 'Try it.',
      skill_tag: 'preterite-vs-present',
    })
    vi.mocked(streamTutor).mockReturnValue(gen([json]))
    const onParsed = vi.fn()

    await collect(
      streamStructuredTutorReply(BASE_REQ, { explanationLanguageName: 'English', onParsed }),
    )

    expect(onParsed).toHaveBeenCalledTimes(1)
    expect(onParsed).toHaveBeenCalledWith(
      expect.objectContaining({ correction: 'Fui al mercado.', skill_tag: 'preterite-vs-present' }),
    )
  })

  it('does not invoke onParsed in pass-through mode (nothing structured to report)', async () => {
    vi.mocked(streamTutor).mockReturnValue(gen(['Hola', ', ', '¿qué tal?']))
    const onParsed = vi.fn()

    await collect(
      streamStructuredTutorReply(BASE_REQ, { explanationLanguageName: 'English', onParsed }),
    )

    expect(onParsed).not.toHaveBeenCalled()
  })

  it('does not call the repair endpoint when the explanation language already matches', async () => {
    const json = JSON.stringify({
      conversation: 'Hola',
      correction: null,
      explanation: 'You need the preterite because the action is finished.',
      explanation_language: 'English',
      practice: 'Try it.',
    })
    vi.mocked(streamTutor).mockReturnValue(gen([json]))
    const spy = vi.spyOn(global, 'fetch')

    await collect(
      streamStructuredTutorReply(BASE_REQ, {
        explanationLanguageName: 'English',
        repairModelId: 'some/model',
      }),
    )
    expect(spy).not.toHaveBeenCalled()
  })
})
