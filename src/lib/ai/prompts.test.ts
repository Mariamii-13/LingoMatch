import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './prompts'
import { CEFR_LEVELS, PRACTICE_MODES, SUPPORTED_LANGUAGES } from '@/config/ai-practice'

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
})

describe('buildSystemPrompt — correction behaviour', () => {
  it('requires obvious grammar and spelling mistakes to be corrected', () => {
    expect(B1).toMatch(/never ignore an obvious grammar, spelling, word-choice, or word-order mistake/i)
    expect(B1).toMatch(/must contain the corrected sentence written out in full/i)
    expect(B1).toMatch(/never reply to a flawed message with conversation and a question only/i)
  })

  it('ends with a pre-send checklist covering correction, openers, Markdown, and length', () => {
    expect(B1).toMatch(/CHECK BEFORE YOU SEND/)
    expect(B1).toMatch(/must already contain the corrected sentence written out/i)
    expect(B1).toMatch(/engage the topic rather than compliment the learner/i)
    expect(B1).toMatch(/any Markdown characters\? Remove them\./i)
    expect(B1.trimEnd().endsWith('Cut it.')).toBe(true)
  })

  it('shows one worked example of reply shape without licensing its wording', () => {
    expect(B1).toMatch(/SHAPE OF A GOOD REPLY/)
    expect(B1).toMatch(/Yesterday I went to the shop to buy bread/)
    expect(B1).toMatch(/Copy that shape, never that wording, and never that example sentence\./)
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

  it('separates conversation, correction, explanation, and practice', () => {
    expect(B1).toMatch(/1\. CONVERSATION:/)
    expect(B1).toMatch(/2\. CORRECTION:/)
    expect(B1).toMatch(/3\. EXPLANATION:/)
    expect(B1).toMatch(/4\. PRACTICE:/)
    expect(B1).toMatch(/skip parts 2 and 3/i)
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

describe('buildSystemPrompt — coverage across inputs', () => {
  it('produces a prompt for every language, level, and mode', () => {
    for (const language of SUPPORTED_LANGUAGES) {
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
