import 'server-only'
import type { EvalCase } from './eval-cases'
import { parseStructuredReply, explanationLanguageMismatch } from './structured-tutor-reply'

/**
 * Grading functions for roadmap #29 (§19.6.2). Deliberately grades the raw
 * model output — not the post-repair result from
 * `streamStructuredTutorReply` — because the repair call (roadmap #28) can
 * paper over a wrong-language explanation regardless of which model
 * produced it. Grading after repair would make every model look equally
 * compliant on the one axis this harness exists to differentiate models on:
 * "correction present, explanation-language correctness by turn... this is
 * the number that should decide the model" (§19.6.2). The repair call is a
 * safety net for production traffic; this harness measures what it's a net
 * *under*.
 */

export type EvalGrade = {
  pairId: number
  label: string
  /** The raw model reply parsed as valid structured JSON at all. */
  parsed: boolean
  /** A correction was present — every seeded case contains a real mistake. */
  correctionPresent: boolean
  explanationPresent: boolean
  /** Independently language-checked against the pair's explanation language — the core metric. */
  explanationLanguageCorrect: boolean
  noMarkdown: boolean
  noBannedOpener: boolean
  raw: string
}

const MARKDOWN = /\*\*|^#{1,6}\s|^\s*\|.*\|\s*$/m
const COMPLIMENT_OPENER =
  /^(excellent|great|wonderful|fantastic|awesome|well done|nice)\b|^(that's|that is|what) (a |an )?(great|good|excellent|wonderful|interesting|wise|lovely)/i

export function gradeCase(testCase: EvalCase, raw: string): EvalGrade {
  const parsed = parseStructuredReply(raw)

  const allFieldText = parsed
    ? [parsed.conversation, parsed.correction, parsed.explanation, parsed.practice]
        .filter((part): part is string => Boolean(part))
        .join('\n')
    : raw
  const openerSource = parsed ? parsed.conversation : raw

  const explanationLanguageCorrect = parsed?.explanation
    ? !explanationLanguageMismatch(parsed.explanation, testCase.explanationLanguage)
    : false

  return {
    pairId: testCase.pairId,
    label: testCase.label,
    parsed: parsed !== null,
    correctionPresent: parsed?.correction != null,
    explanationPresent: parsed?.explanation != null,
    explanationLanguageCorrect,
    noMarkdown: !MARKDOWN.test(allFieldText),
    noBannedOpener: !COMPLIMENT_OPENER.test(openerSource.trim()),
    raw,
  }
}

export type EvalSummary = {
  total: number
  parsedRate: number
  correctionRate: number
  explanationLanguageCorrectRate: number
  markdownFreeRate: number
  cleanOpenerRate: number
}

function rate(grades: EvalGrade[], predicate: (g: EvalGrade) => boolean): number {
  if (grades.length === 0) return 0
  return grades.filter(predicate).length / grades.length
}

/** Aggregates grades into pass rates — the harness's actual output, per model. */
export function summarizeGrades(grades: EvalGrade[]): EvalSummary {
  return {
    total: grades.length,
    parsedRate: rate(grades, (g) => g.parsed),
    correctionRate: rate(grades, (g) => g.correctionPresent),
    explanationLanguageCorrectRate: rate(grades, (g) => g.explanationLanguageCorrect),
    markdownFreeRate: rate(grades, (g) => g.noMarkdown),
    cleanOpenerRate: rate(grades, (g) => g.noBannedOpener),
  }
}
