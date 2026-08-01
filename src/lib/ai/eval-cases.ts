import 'server-only'
import type { PracticeMode, TutorLevel } from '@/config/ai-practice'

/**
 * Roadmap #29 (§19.6.2): "no public benchmark measures LingoMatch's actual
 * requirement... this project has to measure it directly." This is the seed
 * case matrix — one representative, genuinely-mistaken sentence per Tier-1
 * pair (§19.5's 8 native→target pairs), not synthetic filler. §19.3's model
 * pick is a hypothesis; this is what actually checks it, across the full
 * breadth of pairs the passport claims to support — not just the 2 pairs
 * spot-checked live in 3.38/20.6.
 *
 * Deliberately v1-scoped: one seeded mistake per pair (8 cases total, 8 live
 * calls per run), not the full "20-turn session per pair" §19.6.2 describes
 * as the eventual target. Expanding to more error types per pair and to full
 * multi-turn sessions is the next increment — see the passport for why this
 * scope was chosen over building the larger version first.
 */

export type EvalCase = {
  /** Matches the numbering in §19.5's pair table. */
  pairId: number
  label: string
  nativeLanguage: string
  explanationLanguage: string
  targetLanguage: string
  level: TutorLevel
  mode: PracticeMode
  /** A real sentence containing the seeded mistake described in `mistake`. */
  userMessage: string
  mistake: string
}

export const EVAL_CASES: EvalCase[] = [
  {
    pairId: 1,
    label: 'Spanish → English',
    nativeLanguage: 'Spanish',
    explanationLanguage: 'Spanish',
    targetLanguage: 'English',
    level: 'B1',
    mode: 'Free Conversation',
    userMessage: 'Yesterday I go to the store and buyed some bread.',
    mistake: 'past tense (go→went) and irregular verb (buyed→bought)',
  },
  {
    pairId: 2,
    label: 'English → Spanish',
    nativeLanguage: 'English',
    explanationLanguage: 'English',
    targetLanguage: 'Spanish',
    level: 'B1',
    mode: 'Free Conversation',
    userMessage: 'Ayer yo va al mercado y compro pan.',
    mistake: 'preterite tense (va→fui, compro→compré)',
  },
  {
    pairId: 3,
    label: 'Portuguese (BR) → English',
    nativeLanguage: 'Portuguese',
    explanationLanguage: 'Portuguese',
    targetLanguage: 'English',
    level: 'B1',
    mode: 'Free Conversation',
    userMessage: 'Yesterday I goed to school and I seen my friend.',
    mistake: 'irregular past tense (goed→went, seen→saw)',
  },
  {
    pairId: 4,
    label: 'Spanish → French (stress test: two close Romance languages)',
    nativeLanguage: 'Spanish',
    explanationLanguage: 'Spanish',
    targetLanguage: 'French',
    level: 'B1',
    mode: 'Free Conversation',
    userMessage: "Hier je suis allé au marché et j'ai acheter des pommes.",
    mistake: "past participle after avoir (acheter→acheté)",
  },
  {
    pairId: 5,
    label: 'Portuguese (BR) → Spanish (extreme case: portuñol interference)',
    nativeLanguage: 'Portuguese',
    explanationLanguage: 'Portuguese',
    targetLanguage: 'Spanish',
    level: 'B1',
    mode: 'Free Conversation',
    userMessage: 'Yo gosto muito de estudiar espanhol e é muy divertido.',
    mistake: 'Portuguese words substituted into Spanish (gosto, muito, estudiar, espanhol)',
  },
  {
    pairId: 6,
    label: 'English → French',
    nativeLanguage: 'English',
    explanationLanguage: 'English',
    targetLanguage: 'French',
    level: 'B1',
    mode: 'Free Conversation',
    userMessage: "Hier je vais au magasin et j'achete du pain.",
    mistake: 'present tense where passé composé is needed (vais→suis allé, achete→ai acheté)',
  },
  {
    pairId: 7,
    label: 'French → English',
    nativeLanguage: 'French',
    explanationLanguage: 'French',
    targetLanguage: 'English',
    level: 'B1',
    mode: 'Free Conversation',
    userMessage: 'Yesterday I go to the market and I buyed bread.',
    mistake: 'past tense (go→went) and irregular verb (buyed→bought)',
  },
  {
    pairId: 8,
    label: 'Spanish → Portuguese (BR)',
    nativeLanguage: 'Spanish',
    explanationLanguage: 'Spanish',
    targetLanguage: 'Portuguese',
    level: 'B1',
    mode: 'Free Conversation',
    userMessage: 'Ontem eu vou ao mercado e compro pão.',
    mistake: 'present tense where past is needed (vou→fui, compro→comprei)',
  },
]
