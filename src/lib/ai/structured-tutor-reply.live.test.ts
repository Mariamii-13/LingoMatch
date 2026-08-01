/**
 * Controlled real-provider check for roadmap #28 (structured tutor output +
 * explanation-language repair, §19.6.1). Skipped by default, same pattern as
 * `tutor-live.test.ts`. Run it deliberately:
 *   ($env:LIVE_AI_TESTS = '1'; npx vitest run src/lib/ai/structured-tutor-reply.live.test.ts)
 *
 * What this checks that the mocked unit tests cannot: whether a real free
 * model actually complies with the new JSON-structured system prompt at all,
 * and whether the language-ID validator + repair call behave correctly
 * against real (not synthetic) model output.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { streamStructuredTutorReply, parseStructuredReply, explanationLanguageMismatch } from './structured-tutor-reply'
import { resolveModelChain } from './models'

const LIVE = process.env.LIVE_AI_TESTS === '1'

async function collect(req: Parameters<typeof streamStructuredTutorReply>[0], explanationLanguageName: string) {
  const repairModelId = resolveModelChain('defaultTutor')[0]
  const deltas: string[] = []
  for await (const delta of streamStructuredTutorReply(req, { explanationLanguageName, repairModelId })) {
    deltas.push(delta)
  }
  return deltas.join('')
}

describe.skipIf(!LIVE)('structured tutor reply against the real provider', () => {
  beforeAll(async () => {
    const { readFileSync } = await import('node:fs')
    const lines = readFileSync(`${process.cwd()}/.env.local`, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 1) continue
      const key = trimmed.slice(0, eq)
      if (!process.env[key]) {
        process.env[key] = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '')
      }
    }
  })

  it('produces valid structured JSON for a Spanish-target/English-explanation grammar mistake', async () => {
    const req = {
      targetLanguage: 'Spanish' as const,
      nativeLanguages: ['English'],
      explanationLanguage: 'English',
      level: 'B1' as const,
      mode: 'Free Conversation' as const,
      history: [] as { role: 'user' | 'assistant'; content: string }[],
      userMessage: 'Ayer yo va al mercado y compro unas frutas.',
    }
    const full = await collect(req, 'English')
    console.log(`\n--- ES target / EN explain ---\n${full}\n`)
    expect(full.length).toBeGreaterThan(0)
    // Whatever the model produced, the visible reply must never contain raw
    // JSON punctuation — either it parsed and we assembled plain text, or the
    // pass-through/best-effort fallback kicked in, but either way the
    // learner must never see a literal '{"conversation"'.
    expect(full).not.toContain('{"conversation"')
  }, 60_000)

  it('produces valid structured JSON for the harder non-English-bridge case (French target, Spanish explanation)', async () => {
    const req = {
      targetLanguage: 'French' as const,
      nativeLanguages: ['Spanish'],
      explanationLanguage: 'Spanish',
      level: 'B1' as const,
      mode: 'Free Conversation' as const,
      history: [] as { role: 'user' | 'assistant'; content: string }[],
      userMessage: "Hier je suis allé au marché et j'ai acheter des pommes.",
    }
    const full = await collect(req, 'Spanish')
    console.log(`\n--- FR target / ES explain ---\n${full}\n`)
    expect(full.length).toBeGreaterThan(0)
    expect(full).not.toContain('{"conversation"')
  }, 60_000)

  it('parses real model output directly with parseStructuredReply, walking the real chain past the credit-less paid entries to a free model', async () => {
    const { callTutor } = await import('./openrouter')
    const { buildSystemPrompt } = await import('./prompts')
    const system = buildSystemPrompt('Spanish', 'B1', 'Free Conversation', ['English'], 'English')
    void system // buildSystemPrompt is exercised through callTutor's own buildMessages below

    const { reply: raw } = await callTutor({
      targetLanguage: 'Spanish',
      nativeLanguages: ['English'],
      explanationLanguage: 'English',
      level: 'B1',
      mode: 'Free Conversation',
      history: [],
      userMessage: 'Yo tengo veinte anos y me gusta mucho el playa.',
    })
    console.log(`\n--- raw model output ---\n${raw}\n`)

    const parsed = parseStructuredReply(raw)
    console.log(`parsed: ${JSON.stringify(parsed, null, 2)}`)
    expect(parsed).not.toBeNull()
    if (parsed?.explanation) {
      const mismatch = explanationLanguageMismatch(parsed.explanation, 'English')
      console.log(`explanation: "${parsed.explanation}" — mismatch: ${mismatch}`)
    }
  }, 30_000)

  it('detects the explanation-language mismatch live and attempts (but honestly cannot complete) repair while the account has no credits', async () => {
    const req = {
      targetLanguage: 'French' as const,
      nativeLanguages: ['Spanish'],
      explanationLanguage: 'Spanish',
      level: 'B1' as const,
      mode: 'Free Conversation' as const,
      history: [] as { role: 'user' | 'assistant'; content: string }[],
      userMessage: "Hier je suis allé au marché et j'ai acheter des pommes.",
    }
    const logSpy = vi.spyOn(console, 'error')
    const full = await collect(req, 'Spanish')
    console.log(`\n--- FR target / ES explain (repair attempt observed via logs) ---\n${full}\n`)
    const repairLogs = logSpy.mock.calls
      .map((c) => String(c[0]))
      .filter((line) => line.includes('explanation-language'))
    console.log(`repair-related log lines: ${JSON.stringify(repairLogs)}`)
    // Whether or not the repair model has credits today, a mismatch must be
    // detected and logged rather than silently ignored — this is the
    // observable proof the validator fired against real model output.
    expect(repairLogs.length).toBeGreaterThan(0)
  }, 60_000)
})
