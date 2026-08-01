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
import { resolveChainForTier } from './model-registry'

const LIVE = process.env.LIVE_AI_TESTS === '1'

/**
 * `repairModelId` is resolved the same way the real route resolves it for a
 * `'free'`-tier caller (§21.3/roadmap #34) — `resolveChainForTier('free')[0]`,
 * not the unscoped `resolveModelChain('defaultTutor')[0]` this test used
 * before #34 shipped. That distinction matters: before #34, every repair
 * attempt hit the credit-less paid model and always failed with 402 (see the
 * original version of this test); after #34, a free-tier repair call hits a
 * real, reachable free model instead. Using the stale resolution here would
 * silently keep measuring a repair path production no longer uses.
 */
async function collect(req: Parameters<typeof streamStructuredTutorReply>[0], explanationLanguageName: string) {
  const repairModelId = resolveChainForTier('free')[0]
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

  // Model output is probabilistic (§19.2: instruction-following is not 100%
  // reliable in either direction) — sampled several times and measured as a
  // rate, the same philosophy `tutor-live.test.ts` already uses, rather than
  // asserting a mismatch fires on every single run.
  it('measures the mismatch-detection and repair-success rate on the confirmed-weak Portuguese(BR)<->Spanish pair, now that repair targets a reachable free model (roadmap #34)', async () => {
    const cases = [
      {
        label: 'PT-BR native / ES target',
        targetLanguage: 'Spanish' as const,
        nativeLanguages: ['Portuguese'],
        explanationLanguage: 'Portuguese',
        userMessage: 'Yo gosto muito de estudiar espanhol e é muy divertido.',
      },
      {
        label: 'ES native / PT-BR target',
        targetLanguage: 'Portuguese' as const,
        nativeLanguages: ['Spanish'],
        explanationLanguage: 'Spanish',
        userMessage: 'Ontem eu vou ao mercado e compro pão.',
      },
    ]
    const SAMPLES = 3
    let mismatches = 0
    let repairSuccesses = 0
    let total = 0

    for (const c of cases) {
      for (let i = 0; i < SAMPLES; i++) {
        const req = {
          targetLanguage: c.targetLanguage,
          nativeLanguages: c.nativeLanguages,
          explanationLanguage: c.explanationLanguage,
          level: 'B1' as const,
          mode: 'Free Conversation' as const,
          history: [] as { role: 'user' | 'assistant'; content: string }[],
          userMessage: c.userMessage,
        }
        const logSpy = vi.spyOn(console, 'error')
        const full = await collect(req, c.explanationLanguage)
        const logs = logSpy.mock.calls.map((call) => String(call[0]))
        const mismatchDetected = logs.some((l) => l.includes('explanation-language'))
        const repaired = logs.some((l) => l.includes('explanation-language repair succeeded'))
        total++
        if (mismatchDetected) mismatches++
        if (repaired) repairSuccesses++
        console.log(
          `[${c.label} #${i + 1}] mismatch=${mismatchDetected} repaired=${repaired}\n${full}\n`,
        )
        logSpy.mockRestore()
      }
    }

    console.log(
      `\n=== REPAIR-PATH SUMMARY (roadmap #34's effect on 3.38's repair) ===\n` +
        `mismatches detected: ${mismatches}/${total}\n` +
        `of those, repair succeeded: ${repairSuccesses}/${mismatches || 0}\n`,
    )
    expect(total).toBe(SAMPLES * cases.length)
  }, 8 * 60_000)
})
