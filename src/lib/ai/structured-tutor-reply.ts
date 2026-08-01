import 'server-only'
import { franc } from 'franc'
import { streamTutor, type TutorRequest } from './openrouter'

/**
 * Roadmap #28 (passport §19.6.1, feature 3.38): the explanation-language
 * defect (diagnosed live, §19.1/19.2) is a known failure class — models drift
 * back toward the
 * target language under sustained multi-turn constraint. Prompting alone
 * cannot fix it reliably (§19.2's cited research). This module converts it
 * from a model-capability problem into a validated-output problem: the tutor
 * now replies with structured JSON, and `explanation` is independently
 * language-checked server-side, with one small repair call if it's wrong.
 * This works the same way regardless of which model is in the chain (18.1),
 * so it survives every future model swap without re-tuning a prompt.
 */

export type StructuredTutorReply = {
  conversation: string
  correction: string | null
  explanation: string | null
  explanation_language: string | null
  practice: string | null
  /**
   * A short, free-form identifier for the grammar/vocabulary point the
   * correction was about (e.g. "preterite-vs-present", "ser-vs-estar"), or
   * null when there is no correction. Added for roadmap #31 (§20.2/§20.8):
   * every real correction the tutor already makes is a labelled data point
   * for a learner's own spaced-repetition schedule, once tagged — no new AI
   * capability, reusing this same structured-output mechanism (§19.6.1).
   * Metadata only; never shown to the learner as part of the reply text.
   */
  skill_tag: string | null
}

/**
 * ISO 639-3 codes for the explanation languages this project currently
 * claims support for (passport §19.5's Tier-1 explanation languages: Spanish,
 * English, Brazilian Portuguese). Anything outside this map is not
 * language-validated — the validator must not claim confidence 19.5 itself
 * says hasn't been earned yet for other languages.
 */
const EXPLANATION_LANGUAGE_ISO3: Record<string, string> = {
  English: 'eng',
  Spanish: 'spa',
  Portuguese: 'por',
}

/**
 * Every Tier-1 language (§19.5) — explanation languages plus target
 * languages — franc must be allowed to detect, not just the 3 explanation
 * languages. The diagnosed failure mode (§19.1) is specifically the model
 * writing the explanation in the *target* language instead; if French isn't
 * a candidate here, a French explanation gets force-classified as whichever
 * explanation language it's trigram-closest to (in practice, Spanish) and
 * the mismatch is missed entirely. Confirmed live, 2026-08-01, against the
 * French-target/Spanish-explanation case — see 20.6-style live verification
 * notes for roadmap #28. Extend this set only as §19.5's scope grows.
 */
const TIER1_DETECTION_CANDIDATES: Record<string, string> = {
  ...EXPLANATION_LANGUAGE_ISO3,
  French: 'fra',
}

const CONVERSATION_KEY = '"conversation"'

/** True once the raw model output looks like it will be a JSON object at all. */
export function looksLikeStructuredJson(raw: string): boolean {
  return raw.trimStart().startsWith('{')
}

/**
 * Extracts the "conversation" field's string value from a possibly-incomplete
 * JSON document as it streams in, so the learner still sees the reply appear
 * incrementally — structuring the output must not bring back the "watch a
 * spinner for 9 seconds" problem streaming already fixed (3.8).
 *
 * Re-scans from the start of the accumulated buffer on every call rather than
 * tracking parser state across chunks. A tutor reply is at most a few hundred
 * tokens, so this stays cheap, and re-scanning avoids hand-rolled escape-
 * tracking state surviving a chunk boundary incorrectly — a subtler class of
 * bug than the one this function itself remains correct against by design.
 */
export function extractConversationSoFar(raw: string): string {
  const keyIndex = raw.indexOf(CONVERSATION_KEY)
  if (keyIndex === -1) return ''

  let i = keyIndex + CONVERSATION_KEY.length
  while (i < raw.length && raw[i] !== ':') i++
  if (i >= raw.length) return ''
  i++ // past ':'
  while (i < raw.length && /\s/.test(raw[i])) i++
  if (i >= raw.length || raw[i] !== '"') return ''
  i++ // past opening quote

  const ESCAPES: Record<string, string> = {
    '"': '"',
    '\\': '\\',
    '/': '/',
    n: '\n',
    t: '\t',
    r: '\r',
    b: '\b',
    f: '\f',
  }

  let out = ''
  while (i < raw.length) {
    const ch = raw[i]
    if (ch === '"') return out // closing quote — the string is complete
    if (ch === '\\') {
      // An escape sequence that isn't fully in the buffer yet — stop here
      // and pick it up whole once more text has arrived, rather than
      // guessing at a partial one.
      if (i + 1 >= raw.length) break
      const next = raw[i + 1]
      if (next === 'u') {
        if (i + 6 > raw.length) break
        out += String.fromCharCode(parseInt(raw.slice(i + 2, i + 6), 16))
        i += 6
        continue
      }
      out += ESCAPES[next] ?? next
      i += 2
      continue
    }
    out += ch
    i++
  }
  return out // buffer ended mid-string; this is "so far", not the final value
}

/** Parses a complete structured reply. Returns null on any shape mismatch. */
export function parseStructuredReply(raw: string): StructuredTutorReply | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const obj = data as Record<string, unknown>
  if (typeof obj.conversation !== 'string' || obj.conversation.trim().length === 0) return null

  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.trim().length > 0 ? v.trim() : null

  return {
    conversation: obj.conversation.trim(),
    correction: str(obj.correction),
    explanation: str(obj.explanation),
    explanation_language: str(obj.explanation_language),
    practice: str(obj.practice),
    skill_tag: str(obj.skill_tag),
  }
}

/** The correction/explanation/practice parts, joined for display after "conversation". */
export function formatStructuredTail(reply: Pick<StructuredTutorReply, 'correction' | 'explanation' | 'practice'>): string {
  return [reply.correction, reply.explanation, reply.practice]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Full plain, flowing display text assembled from the structured parts. */
export function formatStructuredReply(reply: StructuredTutorReply): string {
  const tail = formatStructuredTail(reply)
  return tail ? `${reply.conversation} ${tail}` : reply.conversation
}

/**
 * True only when `explanation` is confidently NOT written in
 * `expectedLanguageName` (a profile display name such as "Spanish"). Fails
 * safe: an unmapped language, a missing explanation, or an inconclusive
 * detection all return false (no repair triggered) — a wrongly-triggered
 * repair call costs real latency and money, so only a confident mismatch
 * should fire one. Trusts an independent detector over the model's own
 * self-reported `explanation_language` field, which is exactly the kind of
 * self-check §19.2's research found unreliable under drift.
 */
export function explanationLanguageMismatch(
  explanation: string | null,
  expectedLanguageName: string,
): boolean {
  if (!explanation) return false
  const expectedIso = EXPLANATION_LANGUAGE_ISO3[expectedLanguageName]
  if (!expectedIso) return false // outside §19.5's tested scope — don't claim confidence

  const candidates = Object.values(TIER1_DETECTION_CANDIDATES)
  const detected = franc(explanation, { only: candidates, minLength: 4 })
  if (detected === 'und') return false // inconclusive — don't repair on a guess

  return detected !== expectedIso
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const REPAIR_TIMEOUT_MS = 10_000
const REPAIR_MAX_TOKENS = 200

/**
 * One small, cheap, single-attempt completion asking a model to translate one
 * sentence — the "repair call" in §19.6.1, deliberately not the full tutor
 * chain-walking machinery in `openrouter.ts` (kept untouched — 16's "what not
 * to rewrite" list). A single attempt against the first configured model is
 * the right scope here: this is a best-effort correction to an otherwise
 * complete reply, not the primary request, so on any failure it silently
 * gives up and the caller keeps the original (possibly wrong-language) text
 * rather than compounding latency by retrying — the honest tradeoff §19.6.1
 * itself names ("the rare repair-call path adds latency on failure").
 */
export async function repairTranslation(
  text: string,
  targetLanguageName: string,
  modelId: string | undefined,
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey || !modelId) return null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REPAIR_TIMEOUT_MS)

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'system',
            content: `Translate the user's message into ${targetLanguageName}. Reply with only the translation, nothing else — no quotation marks, no notes, no preamble.`,
          },
          { role: 'user', content: text },
        ],
        max_tokens: REPAIR_MAX_TOKENS,
      }),
      signal: controller.signal,
    })
    if (!response.ok) return null
    const data: unknown = await response.json().catch(() => null)
    const translated = (
      data as { choices?: { message?: { content?: unknown } }[] } | null
    )?.choices?.[0]?.message?.content
    return typeof translated === 'string' && translated.trim() ? translated.trim() : null
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

export type StructuredStreamOptions = {
  /** Profile display name, e.g. "Spanish" — passed straight to the repair call too. */
  explanationLanguageName: string
  /** Model to use for the repair call. Defaults to the chain's first entry. */
  repairModelId?: string
  /**
   * Invoked once with the final (post-repair) structured reply, right before
   * the tail is yielded — never invoked in pass-through/malformed-JSON
   * fallback mode, since there's nothing structured to report. Roadmap #31's
   * only hook into this module: recording a correction is the caller's
   * responsibility (kept out of this file so an AI-reply module doesn't grow
   * a database dependency), this just guarantees the caller sees the parsed
   * data at the moment it's known to be final.
   */
  onParsed?: (parsed: StructuredTutorReply) => void
}

/**
 * Wraps `streamTutor` (unchanged) to add structured-output parsing, language
 * validation, and repair — without touching the chain-walking module itself.
 * Yields the same shape of text deltas `streamTutor` always has: the
 * "conversation" field streams incrementally as it arrives (preserving 3.8's
 * streaming win), and one final delta appends the validated
 * correction/explanation/practice tail once the object is complete.
 *
 * Falls back to plain pass-through, unchanged from pre-#28 behaviour, the
 * moment the model's first character isn't `{` — a model that ignores the
 * JSON instruction entirely must not leave the learner looking at nothing.
 */
export async function* streamStructuredTutorReply(
  req: TutorRequest,
  opts: StructuredStreamOptions,
): AsyncGenerator<string> {
  const gen = streamTutor(req)
  let buffer = ''
  let emitted = 0
  let structured = true

  for await (const delta of gen) {
    buffer += delta

    if (structured && buffer.trim().length > 0 && !looksLikeStructuredJson(buffer)) {
      structured = false
    }

    if (!structured) {
      yield delta
      continue
    }

    const soFar = extractConversationSoFar(buffer)
    if (soFar.length > emitted) {
      yield soFar.slice(emitted)
      emitted = soFar.length
    }
  }

  if (!structured) return // buffer is already the full reply via yielded deltas

  const parsed = parseStructuredReply(buffer)
  if (!parsed) {
    // Malformed JSON despite looking like an object. Whatever "conversation"
    // text was extracted is already on the learner's screen (11.11's
    // partial-reply principle); if nothing was ever extracted, the raw
    // buffer is the only thing left to show rather than a blank message.
    if (emitted === 0 && buffer.trim()) yield buffer.trim()
    console.error(`[AI] structured reply did not parse as JSON: ${buffer.slice(0, 200)}`)
    return
  }

  let explanation = parsed.explanation
  if (explanation && explanationLanguageMismatch(explanation, opts.explanationLanguageName)) {
    const repaired = await repairTranslation(
      explanation,
      opts.explanationLanguageName,
      opts.repairModelId,
    )
    // Logged either way: a triggered-but-failed repair (e.g. the repair
    // model itself has no credits) must be visible, the same reasoning
    // that made the original 402 in 3.5 worth logging in the first place.
    console.error(
      repaired
        ? `[AI] explanation-language repair succeeded (target: ${opts.explanationLanguageName})`
        : `[AI] explanation-language mismatch detected but repair did not succeed (target: ${opts.explanationLanguageName}, model: ${opts.repairModelId ?? 'none'})`,
    )
    if (repaired) explanation = repaired
  }

  const final: StructuredTutorReply = { ...parsed, explanation }
  opts.onParsed?.(final)

  const tail = formatStructuredTail(final)
  if (tail) yield ` ${tail}`
}
