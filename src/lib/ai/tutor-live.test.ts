/**
 * Controlled real-provider conversation check.
 *
 * Skipped by default so the normal suite stays offline and deterministic.
 * Run it deliberately:
 *   ($env:LIVE_AI_TESTS = '1'; npx vitest run src/lib/ai/tutor-live.test.ts)   # PowerShell
 *   LIVE_AI_TESTS=1 npx vitest run src/lib/ai/tutor-live.test.ts
 *
 * Model output is probabilistic, so each scenario is sampled several times.
 * Rules the model honoured in every sample observed so far (plain text, no
 * invented corrections, reply length, a closing question) are asserted per
 * sample. Two rules the model only mostly honours — writing the correction out
 * in full, and not opening with a compliment — are measured and logged as
 * rates, with a floor that catches a total regression rather than a strict
 * threshold that would make this test flaky.
 *
 * Measured with google/gemini-2.5-flash: corrections written out in roughly
 * two thirds of samples, clean openers in roughly two thirds. Making either a
 * guarantee needs a stronger model via AI_MODEL_DEFAULT, or a verify-and-retry
 * step in the route, which is out of scope here.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { callTutor } from './openrouter'

const LIVE = process.env.LIVE_AI_TESTS === '1'
const SAMPLES = 3

const MARKDOWN = /\*\*|^#{1,6}\s|^\s*\|.*\|\s*$/m
const COMPLIMENT_OPENER =
  /^(excellent|great|wonderful|fantastic|awesome|well done|nice)\b|^(that's|that is|what) (a |an )?(great|good|excellent|wonderful|interesting|wise|lovely)/i

/** A repaired form of "plan for study new english beter" appearing in the reply. */
const CORRECTED_FORM =
  /a plan (to|for) (study|studying|improv)|study english better|improve my english|improve your english/i
/** Wording that presents the repair to the learner rather than silently using it. */
const CORRECTION_MARKER =
  /more natural|we (usually |often )?say|would (usually |often )?say|instead of|rather than|correct(ed)? (form|version|sentence)|you (wrote|said|asked)/i

async function sample(userMessage: string, level: 'A2' | 'B1' | 'B2' = 'B1') {
  const replies: string[] = []
  for (let i = 0; i < SAMPLES; i++) {
    const { reply } = await callTutor({
      targetLanguage: 'English',
      nativeLanguages: ['Georgian'],
      explanationLanguage: 'Georgian',
      level,
      mode: 'Free Conversation',
      history: [],
      userMessage,
    })
    replies.push(reply)
  }
  return replies
}

function report(label: string, replies: string[]) {
  console.log(`\n--- ${label} ---`)
  replies.forEach((r, i) => console.log(`[sample ${i + 1}] ${r}\n`))
}

describe.skipIf(!LIVE)('tutor behaviour against the real provider', () => {
  // Next.js deliberately skips .env.local when NODE_ENV is `test`, so read it directly.
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

  it('gives a tired learner something short and easy', async () => {
    const replies = await sample("I'm tired. I don't want study today.")
    report('TIRED LEARNER', replies)
    for (const reply of replies) {
      expect(reply).not.toMatch(MARKDOWN)
      // B1 default is 3–6 sentences; a tired learner should not get more.
      expect(reply.split(/[.!?]+\s/).filter(Boolean).length).toBeLessThanOrEqual(6)
      expect(reply.split(/\s+/).length).toBeLessThan(110)
    }
  }, 90_000)

  it('writes out a correction for an obviously broken sentence', async () => {
    const replies = await sample('can you give me plan for study new english beter?')
    report('CORRECTION', replies)
    // The corrected sentence must appear in full, not be silently repaired
    // inside the tutor's own question.
    const corrected = replies.filter(
      (r) => CORRECTED_FORM.test(r) && CORRECTION_MARKER.test(r),
    )
    console.log(`correction written out in ${corrected.length}/${replies.length} samples`)
    expect(corrected.length).toBeGreaterThan(0)
    for (const reply of replies) expect(reply).not.toMatch(MARKDOWN)
  }, 90_000)

  it('does not invent a correction for a well-formed sentence', async () => {
    const replies = await sample(
      'I enjoy reading historical novels because they help me understand different perspectives.',
      'B2',
    )
    report('MOTIVATED LEARNER', replies)
    for (const reply of replies) {
      expect(reply).not.toMatch(MARKDOWN)
      expect(reply).toMatch(/\?/)
      expect(reply).not.toMatch(/a more natural (way|sentence)|correct(ed)? (version|sentence)/i)
    }
  }, 90_000)

  // Roadmap #34 (§21.3/§20.5): confirms the tier hard filter live, not just
  // against mocks — a 'free'-tier request must never even attempt the
  // credit-less paid model, unlike an unscoped request which tries it first
  // and falls through on a real 402.
  it('never attempts the configured paid model for tier: "free"', async () => {
    const originalConsoleError = console.error
    const calls: string[] = []
    console.error = ((...args: unknown[]) => {
      calls.push(String(args[0]))
      return originalConsoleError(...(args as []))
    }) as typeof console.error

    try {
      const { reply } = await callTutor({
        targetLanguage: 'Spanish',
        nativeLanguages: ['English'],
        explanationLanguage: 'English',
        level: 'B1',
        mode: 'Free Conversation',
        history: [],
        userMessage: 'Hola',
        tier: 'free',
      })
      expect(reply.length).toBeGreaterThan(0)
    } finally {
      console.error = originalConsoleError
    }

    const attemptedPaidModel = calls.some((line) => line.includes('deepseek-v4-flash-0731'))
    console.log(`attempted the paid model while tier: "free": ${attemptedPaidModel}`)
    expect(attemptedPaidModel).toBe(false)
  }, 30_000)

  it('mostly avoids complimenting the learner’s message in the opening line', async () => {
    const replies = [
      ...(await sample('can you give me plan for study new english beter?')),
      ...(await sample(
        'I enjoy reading historical novels because they help me understand different perspectives.',
        'B2',
      )),
    ]
    const clean = replies.filter((r) => !COMPLIMENT_OPENER.test(r.trim()))
    console.log(`clean openers: ${clean.length}/${replies.length}`)
    replies
      .filter((r) => COMPLIMENT_OPENER.test(r.trim()))
      .forEach((r) => console.log(`[compliment opener] ${r.slice(0, 80)}`))
    expect(clean.length).toBeGreaterThan(replies.length / 2)
  }, 180_000)
})
