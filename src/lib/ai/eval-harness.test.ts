import { describe, it, expect } from 'vitest'
import { gradeCase, summarizeGrades } from './eval-harness'
import type { EvalCase } from './eval-cases'

const CASE: EvalCase = {
  pairId: 2,
  label: 'English → Spanish',
  nativeLanguage: 'English',
  explanationLanguage: 'English',
  targetLanguage: 'Spanish',
  level: 'B1',
  mode: 'Free Conversation',
  userMessage: 'Ayer yo va al mercado y compro pan.',
  mistake: 'preterite tense',
}

function json(obj: Record<string, unknown>): string {
  return JSON.stringify(obj)
}

describe('gradeCase', () => {
  it('grades a fully compliant reply as passing every check', () => {
    const grade = gradeCase(
      CASE,
      json({
        conversation: 'El mercado es un buen lugar para comprar.',
        correction: 'Ayer yo fui al mercado y compré pan.',
        explanation: 'Use the preterite tense for a completed past action.',
        explanation_language: 'English',
        practice: 'Try describing what you bought.',
      }),
    )
    expect(grade).toMatchObject({
      parsed: true,
      correctionPresent: true,
      explanationPresent: true,
      explanationLanguageCorrect: true,
      noMarkdown: true,
      noBannedOpener: true,
    })
  })

  it('fails explanationLanguageCorrect when the explanation is in the wrong language', () => {
    const grade = gradeCase(
      CASE,
      json({
        conversation: 'El mercado es un buen lugar para comprar.',
        correction: 'Ayer yo fui al mercado y compré pan.',
        explanation: 'Aquí necesitas el pretérito porque la acción ya terminó completamente.',
        explanation_language: 'English',
        practice: 'Try describing what you bought.',
      }),
    )
    expect(grade.explanationLanguageCorrect).toBe(false)
  })

  it('fails correctionPresent and explanationLanguageCorrect when neither field is present', () => {
    const grade = gradeCase(CASE, json({ conversation: 'Hola, ¿qué tal?' }))
    expect(grade.parsed).toBe(true)
    expect(grade.correctionPresent).toBe(false)
    expect(grade.explanationPresent).toBe(false)
    expect(grade.explanationLanguageCorrect).toBe(false)
  })

  it('fails parsed and every dependent check when the reply is not valid JSON', () => {
    const grade = gradeCase(CASE, 'Ayer yo fui al mercado, no "va".')
    expect(grade.parsed).toBe(false)
    expect(grade.correctionPresent).toBe(false)
    expect(grade.explanationLanguageCorrect).toBe(false)
  })

  it('fails noMarkdown when a field contains Markdown emphasis', () => {
    const grade = gradeCase(
      CASE,
      json({
        conversation: 'El mercado es un buen lugar.',
        correction: '**Ayer yo fui al mercado**',
        explanation: 'Use the preterite.',
        practice: 'Try it.',
      }),
    )
    expect(grade.noMarkdown).toBe(false)
  })

  it('fails noBannedOpener when the conversation field opens with a compliment', () => {
    const grade = gradeCase(
      CASE,
      json({ conversation: "That's a great question! El mercado es un buen lugar.", correction: null }),
    )
    expect(grade.noBannedOpener).toBe(false)
  })

  it('falls back to raw-text grading (markdown/opener) when JSON parsing fails entirely', () => {
    const grade = gradeCase(CASE, "Great job! Here's **the fix**: Ayer yo fui al mercado.")
    expect(grade.parsed).toBe(false)
    expect(grade.noMarkdown).toBe(false)
    expect(grade.noBannedOpener).toBe(false)
  })
})

describe('summarizeGrades', () => {
  it('computes pass rates across multiple graded cases', () => {
    const grades = [
      gradeCase(
        CASE,
        json({
          conversation: 'Hola',
          correction: 'Fui al mercado.',
          explanation: 'Use the preterite.',
          practice: 'Try it.',
        }),
      ),
      gradeCase(CASE, json({ conversation: 'Hola', correction: null })),
    ]
    const summary = summarizeGrades(grades)
    expect(summary.total).toBe(2)
    expect(summary.correctionRate).toBe(0.5)
    expect(summary.explanationLanguageCorrectRate).toBe(0.5)
  })

  it('returns all-zero rates for an empty grade list rather than dividing by zero', () => {
    const summary = summarizeGrades([])
    expect(summary).toMatchObject({
      total: 0,
      parsedRate: 0,
      correctionRate: 0,
      explanationLanguageCorrectRate: 0,
      markdownFreeRate: 0,
      cleanOpenerRate: 0,
    })
  })
})
