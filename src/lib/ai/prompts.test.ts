import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './prompts'
import { CEFR_LEVELS, PRACTICE_MODES } from '@/config/ai-practice'

const B1 = buildSystemPrompt('English', 'B1', 'Free Conversation')

describe('buildSystemPrompt — teacher role', () => {
  it('frames the assistant as a teacher, not a chat partner', () => {
    expect(B1).toMatch(/teacher/i)
    expect(B1).toMatch(/teacher first and a conversation partner second/i)
    expect(B1).toMatch(/every turn should also teach/i)
  })

  it('names the target language and level', () => {
    expect(B1).toContain('English')
    expect(B1).toContain('LEARNER LEVEL: B1')
    expect(B1).toContain('PRACTICE MODE: Free Conversation')
  })

  it('includes native and preferred explanation languages', () => {
    const prompt = buildSystemPrompt(
      'Spanish',
      'B1',
      'Free Conversation',
      ['English', 'Georgian'],
      'Georgian',
    )
    expect(prompt).toContain('NATIVE LANGUAGES: English, Georgian')
    expect(prompt).toContain('EXPLANATION LANGUAGE: Georgian')
    expect(prompt).toMatch(/Georgian.*explanations/i)
  })

  it('handles an unsure level conservatively', () => {
    const prompt = buildSystemPrompt('German', 'unsure', 'Free Conversation', ['English'], 'English')
    expect(prompt).toContain('LEARNER LEVEL: Not sure')
    expect(prompt).toMatch(/beginner-safe|simple vocabulary/i)
  })
})

describe('buildSystemPrompt — correction behaviour', () => {
  it('requires obvious grammar and spelling mistakes to be corrected', () => {
    expect(B1).toMatch(/never ignore an obvious grammar, spelling, word-choice, or word-order mistake/i)
    expect(B1).toMatch(/must contain the corrected sentence written out in full/i)
    expect(B1).toMatch(/never reply to a flawed message with conversation and a question only/i)
  })

  it('does not end with a pre-send prose checklist — the explanation-language check is now machine-validated, not self-checked (19.6.1)', () => {
    expect(B1).not.toMatch(/CHECK BEFORE YOU SEND/)
    expect(B1.trimEnd().endsWith('every field is simply in that one language.')).toBe(true)
  })

  it('shows one worked example of reply shape, illustrating the explanation-language switch, without licensing its wording', () => {
    expect(B1).toMatch(/SHAPE OF A GOOD REPLY/)
    expect(B1).toMatch(/Hier, je suis allé au magasin/)
    expect(B1).toMatch(/Copy that shape and that language split/)
  })

  it('tells the model to write the explanation in the explanation language, not the target language', () => {
    const prompt = buildSystemPrompt(
      'Spanish',
      'B1',
      'Free Conversation',
      ['English', 'Georgian'],
      'Georgian',
    )
    expect(prompt).toMatch(
      /Written in Georgian, not Spanish — a learner who only knows Georgian must be able to read it\./,
    )
  })

  it('forbids inventing corrections when the learner is correct', () => {
    expect(B1).toMatch(/never invent a mistake/i)
    expect(B1).toMatch(/say nothing about errors/i)
  })

  it('gives a correct message an upgrade instead of a correction', () => {
    expect(B1).toMatch(/give them one upgrade/i)
    expect(B1).toMatch(/a richer word, a more idiomatic phrasing/i)
  })

  it('limits corrections to one main point per turn', () => {
    expect(B1).toMatch(/one main point per turn/i)
    expect(B1).toMatch(/do not stack several corrections/i)
  })

  it('requires a structured JSON reply with conversation, correction, explanation, explanation_language, and practice fields (19.6.1)', () => {
    expect(B1).toMatch(/RESPONSE FORMAT/)
    expect(B1).toMatch(/ONLY a single JSON object/i)
    expect(B1).toContain(
      '{"conversation": string, "correction": string or null, "explanation": string or null, "explanation_language": string, "practice": string, "skill_tag": string or null}',
    )
    expect(B1).toMatch(/"conversation":\s*react to what the learner actually means/i)
    expect(B1).toMatch(/"correction":.*one corrected version of their own words/i)
    expect(B1).toMatch(/"explanation":.*one brief sentence/i)
    expect(B1).toMatch(/"practice":.*short prompt asking the learner to continue/i)
    expect(B1).toMatch(/set "correction", "explanation", and "skill_tag" to null/i)
  })

  it('asks for a machine-readable skill_tag on every correction, for roadmap #31\'s spaced-repetition deck', () => {
    expect(B1).toMatch(/"skill_tag":.*grammar or vocabulary point/i)
    expect(B1).toMatch(/never shown to the learner/i)
  })

  it('asks the learner to reuse the corrected phrase', () => {
    expect(B1).toMatch(/repeat, rewrite, or reuse the corrected phrase/i)
  })
})

describe('buildSystemPrompt — energy adaptation', () => {
  it('shortens the task for short or low-effort answers', () => {
    expect(B1).toMatch(/short, low-effort, or flat answers.*shorten your reply/is)
    expect(B1).toMatch(/two or three simple answer choices/i)
  })

  it('raises difficulty for detailed, motivated answers', () => {
    expect(B1).toMatch(/detailed, curious, or ambitious answers.*push slightly harder/is)
    expect(B1).toMatch(/richer vocabulary/i)
    expect(B1).toMatch(/deeper follow-up/i)
  })

  it('simplifies for a frustrated learner', () => {
    expect(B1).toMatch(/signs of frustration.*simplify the explanation/is)
    expect(B1).toMatch(/one small step/i)
  })

  it('offers a tiny opt-out practice to a tired learner', () => {
    expect(B1).toMatch(/tired or do not want to study.*do not lecture/is)
    expect(B1).toMatch(/two-minute practice/i)
    expect(B1).toMatch(/stop whenever they like/i)
  })

  it('restricts emotional inference to the learner’s own messages and tentative wording', () => {
    expect(B1).toMatch(/only from the learner's actual messages/i)
    expect(B1).toMatch(/tentatively/i)
    expect(B1).toMatch(/never state an invented emotion as fact/i)
  })
})

describe('buildSystemPrompt — anti-robotic rules', () => {
  it('bans repetitive automatic praise', () => {
    expect(B1).toMatch(/never begin a reply by complimenting or evaluating the learner's message/i)
    expect(B1).toMatch(/every "That's a \.\.\." or "What a \.\.\." compliment frame/i)
    expect(B1).toMatch(/praise only when it is earned and specific/i)
  })

  it('requires varied wording and structure', () => {
    expect(B1).toMatch(/vary your wording, sentence openings, and reply structure/i)
  })

  it('bans unrequested lists and motivational filler', () => {
    expect(B1).toMatch(/no numbered lists or study plans unless the learner explicitly asks/i)
    expect(B1).toMatch(/no generic motivational speeches/i)
  })

  it('bans shaming and mismatched cheerfulness', () => {
    expect(B1).toMatch(/never shame the learner/i)
    expect(B1).toMatch(/never sound cheerful at a learner who is frustrated or tired/i)
  })
})

describe('buildSystemPrompt — plain-text output', () => {
  it('forbids Markdown formatting', () => {
    expect(B1).toMatch(/plain text only/i)
    expect(B1).toMatch(/no asterisks for bold/i)
    expect(B1).toMatch(/no headings, no tables/i)
  })

  it('contains no Markdown emphasis, headings, or tables itself', () => {
    for (const level of CEFR_LEVELS) {
      const prompt = buildSystemPrompt('English', level, 'Grammar Practice')
      expect(prompt).not.toMatch(/\*\*/)
      expect(prompt).not.toMatch(/^#{1,6}\s/m)
      expect(prompt).not.toMatch(/^\s*\|.*\|\s*$/m)
    }
  })
})

describe('buildSystemPrompt — CEFR calibration', () => {
  const expectedLength: Record<string, string> = {
    A1: '2–4 very short sentences',
    A2: '2–4 short sentences',
    B1: '3–6 sentences',
    B2: '3–6 sentences',
    C1: '4–7 sentences',
    C2: '4–7 sentences',
  }

  it('states the per-level default reply length', () => {
    for (const level of CEFR_LEVELS) {
      const prompt = buildSystemPrompt('English', level, 'Free Conversation')
      expect(prompt).toContain(`RESPONSE LENGTH: ${expectedLength[level]}`)
      expect(prompt).toMatch(/shorter still for a tired or low-energy learner/i)
    }
  })

  it('caps A1/A2 at one correction with a very brief explanation', () => {
    for (const level of ['A1', 'A2'] as const) {
      const prompt = buildSystemPrompt('English', level, 'Free Conversation')
      expect(prompt).toMatch(/correct one mistake only/i)
      expect(prompt).toMatch(/answer choices|example answers/i)
    }
  })

  it('gives C1 nuance and register instead of basic correction', () => {
    const prompt = buildSystemPrompt('English', 'C1', 'Free Conversation')
    expect(prompt).toMatch(/nuance, register, collocation, and idiomatic alternatives/i)
    expect(prompt).toMatch(/do not over-explain unless asked/i)
  })

  it('allows long output only when the learner asks for it', () => {
    expect(B1).toMatch(/longer answer only if the learner explicitly asks/i)
  })
})

describe('buildSystemPrompt — learner weak-areas context (§20.8 item 5)', () => {
  it('adds no weak-areas line at all when the array is omitted', () => {
    expect(B1).not.toMatch(/WEAK AREAS/)
  })

  it('adds no weak-areas line when the array is empty — never fabricates a weakness', () => {
    const prompt = buildSystemPrompt('English', 'B1', 'Free Conversation', ['Spanish'], 'Spanish', [])
    expect(prompt).not.toMatch(/WEAK AREAS/)
  })

  it('includes the real weak areas, worded as an option rather than an assignment', () => {
    const prompt = buildSystemPrompt(
      'Spanish',
      'B1',
      'Free Conversation',
      ['English'],
      'English',
      ['Preterite vs present', 'Ser vs estar'],
    )
    expect(prompt).toMatch(/LEARNER'S KNOWN WEAK AREAS/)
    expect(prompt).toContain('Preterite vs present, Ser vs estar')
    expect(prompt).toMatch(/do not force it, do not turn it into a quiz or drill/i)
    expect(prompt).toMatch(/do not mention that you are tracking this/i)
  })
})

describe('buildSystemPrompt — coverage across inputs', () => {
  it('produces a prompt for every language, level, and mode', () => {
    for (const language of ['English', 'Spanish', 'Japanese', 'Georgian']) {
      for (const level of CEFR_LEVELS) {
        for (const mode of PRACTICE_MODES) {
          const prompt = buildSystemPrompt(language, level, mode)
          expect(prompt).toContain(language)
          expect(prompt).toContain(`LEARNER LEVEL: ${level}`)
          expect(prompt).toContain(`PRACTICE MODE: ${mode}`)
          expect(prompt.length).toBeGreaterThan(500)
        }
      }
    }
  })
})
