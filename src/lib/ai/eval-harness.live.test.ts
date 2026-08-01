/**
 * The eval harness itself (roadmap #29, §19.6.2). Skipped by default, same
 * pattern as `tutor-live.test.ts` and `structured-tutor-reply.live.test.ts`.
 * Run it deliberately:
 *   ($env:LIVE_AI_TESTS = '1'; npx vitest run src/lib/ai/eval-harness.live.test.ts)
 *
 * Runs every seeded case in `eval-cases.ts` — one real, natural mistake per
 * Tier-1 pair (§19.5) — against the real chain's current pinned model,
 * grades the raw output (before any repair), and prints a per-metric
 * pass-rate report. Per §19.6.2: "run it on every model-chain change, not
 * once." A floor, not a strict threshold, on the two metrics real drift
 * research (§19.2) says are hardest for a model to hold — explanation
 * language and correction presence — so the harness catches a real
 * regression without being flaky on ordinary model variance.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { callTutor } from './openrouter'
import { EVAL_CASES } from './eval-cases'
import { gradeCase, summarizeGrades, type EvalGrade } from './eval-harness'

const LIVE = process.env.LIVE_AI_TESTS === '1'

describe.skipIf(!LIVE)('AI-quality eval harness (roadmap #29)', () => {
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

  it('grades every Tier-1 pair and reports pass rates', async () => {
    const grades: EvalGrade[] = []

    for (const testCase of EVAL_CASES) {
      const { reply } = await callTutor({
        targetLanguage: testCase.targetLanguage,
        nativeLanguages: [testCase.nativeLanguage],
        explanationLanguage: testCase.explanationLanguage,
        level: testCase.level,
        mode: testCase.mode,
        history: [],
        userMessage: testCase.userMessage,
      })
      const grade = gradeCase(testCase, reply)
      grades.push(grade)
      console.log(
        `\n--- #${grade.pairId} ${grade.label} ---\n` +
          `mistake seeded: ${testCase.mistake}\n` +
          `raw: ${grade.raw.slice(0, 700)}\n` +
          `parsed=${grade.parsed} correction=${grade.correctionPresent} ` +
          `explanation=${grade.explanationPresent} explanationLanguageCorrect=${grade.explanationLanguageCorrect} ` +
          `noMarkdown=${grade.noMarkdown} noBannedOpener=${grade.noBannedOpener}`,
      )
    }

    const summary = summarizeGrades(grades)
    console.log(`\n=== EVAL HARNESS SUMMARY (${summary.total} pairs) ===`)
    console.log(`parsed as valid JSON:            ${(summary.parsedRate * 100).toFixed(0)}%`)
    console.log(`correction present:               ${(summary.correctionRate * 100).toFixed(0)}%`)
    console.log(`explanation language correct:     ${(summary.explanationLanguageCorrectRate * 100).toFixed(0)}%`)
    console.log(`markdown-free:                    ${(summary.markdownFreeRate * 100).toFixed(0)}%`)
    console.log(`clean (non-compliment) opener:    ${(summary.cleanOpenerRate * 100).toFixed(0)}%`)

    const failedPairs = grades.filter((g) => !g.explanationLanguageCorrect).map((g) => g.label)
    if (failedPairs.length > 0) {
      console.log(`\npairs that failed explanation-language: ${failedPairs.join(', ')}`)
    }

    // A floor, not a strict pass rate — §19.7's own honesty applies here
    // too: this is 8 samples, one per pair, not a statistically confident
    // benchmark. It exists to catch a real regression (a model-chain change
    // that breaks most pairs), not to certify a specific percentage.
    expect(summary.parsedRate).toBeGreaterThanOrEqual(0.75)
    expect(summary.correctionRate).toBeGreaterThanOrEqual(0.75)
  }, 8 * 90_000)
})
