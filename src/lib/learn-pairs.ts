/**
 * The public `/learn/[pair]` pages, one per Tier-1 language pair (PROJECT_PASSPORT.md
 * §19.5 — the 8 directional pairs collapse into 5 unordered ones since matching is
 * reciprocal: a Spanish speaker learning English is the same pool as an English
 * speaker learning Spanish). §18.3 warns against thin, auto-generated pages, so each
 * entry carries a real, pair-specific `challenge` rather than a templated paragraph
 * with the language name swapped in.
 */
export type LearnPair = {
  slug: string
  nativeCode: string
  nativeName: string
  targetCode: string
  targetName: string
  /** What makes this specific pair hard — must be true, not generic filler. */
  challenge: string
  /** How LingoMatch's actual, shipped mechanism addresses that challenge. */
  approach: string
}

export const LEARN_PAIRS: LearnPair[] = [
  {
    slug: "spanish-english",
    nativeCode: "es",
    nativeName: "Spanish",
    targetCode: "en",
    targetName: "English",
    challenge:
      "Spanish speakers learning English run into false friends (\"embarazada\" isn't \"embarrassed\"), a verb-tense system that doesn't map one-to-one onto Spanish's, and prepositions that follow no reliable rule (\"depend on\", not \"depend of\"). English speakers learning Spanish hit the opposite wall: two verbs for \"to be\" (ser/estar), grammatical gender, and a subjunctive mood English barely marks at all.",
    approach:
      "LingoMatch's AI tutor explains a mistake in the learner's own native language by default, so a Spanish speaker gets a Spanish explanation of an English grammar point instead of an English explanation of English — the thing most tutoring apps get backwards. Real conversation practice comes from matching with an actual English or Spanish speaker who's learning the other language, by text, live voice, or optional video.",
  },
  {
    slug: "portuguese-english",
    nativeCode: "pt",
    nativeName: "Portuguese",
    targetCode: "en",
    targetName: "English",
    challenge:
      "Brazilian Portuguese speakers learning English contend with English's inconsistent spelling-to-pronunciation mapping and a much simpler verb conjugation system that hides tense and person information Portuguese marks explicitly. English speakers learning Portuguese face nasal vowels and diphthongs with no real English equivalent, plus two forms of \"you\" whose usage varies by region.",
    approach:
      "The same own-language explanation rule applies here: a Brazilian Portuguese speaker's corrections and grammar explanations arrive in Portuguese, not English, removing the second-language bridge most apps force learners through. Matching pairs real Portuguese and English speakers directly for live text or voice practice.",
  },
  {
    slug: "spanish-french",
    nativeCode: "es",
    nativeName: "Spanish",
    targetCode: "fr",
    targetName: "French",
    challenge:
      "Spanish and French are close enough that a learner's own native language quietly leaks into the explanation, or a French sentence drifts into Spanish grammar mid-thought — the two Romance languages share enough vocabulary and structure that keeping them cleanly separated is harder than pairing either with English.",
    approach:
      "This is deliberately one of the pairs LingoMatch's own AI-quality evaluation harness tests hardest, precisely because the languages sit so close together. Explanations are checked for language-mixing before a learner sees them, with an automatic repair pass if one slips through — and human matching with a real French or Spanish speaker sidesteps the AI-explanation question for the conversation itself entirely.",
  },
  {
    slug: "portuguese-spanish",
    nativeCode: "pt",
    nativeName: "Portuguese",
    targetCode: "es",
    targetName: "Spanish",
    challenge:
      "Portuguese and Spanish are close enough that mixing them has its own name — \"portuñol\" — and it's a real, documented weak spot: LingoMatch's own quality testing found genuine code-mixed explanations on this exact pair before a fix shipped. It's the single hardest pair in the product's supported language set, not a hypothetical edge case.",
    approach:
      "Because this pair is a known hard case, every explanation is checked by an independent language-identification pass before it reaches the learner, with an automatic repair call if mixing is detected — verified live to catch and correct exactly this failure mode. Matching with a real Portuguese or Spanish speaker for live conversation avoids the AI-explanation risk altogether for the parts of practice that matter most: actually talking.",
  },
  {
    slug: "english-french",
    nativeCode: "en",
    nativeName: "English",
    targetCode: "fr",
    targetName: "French",
    challenge:
      "English and French share an enormous amount of vocabulary from a shared history — and that's exactly what makes \"faux amis\" (false friends) so common: \"actuellement\" doesn't mean \"actually\", \"assister\" doesn't mean \"assist\". French's liaison, silent letters and nasal vowels also make spoken French diverge from its spelling more than most learners expect.",
    approach:
      "LingoMatch explains French grammar and corrections in English by default for an English speaker, and vice versa for a French speaker learning English, then pairs that with real conversation practice against an actual native or fluent speaker of the target language — by text, live voice, or optional video — rather than scripted dialogue.",
  },
]

export function findLearnPair(slug: string): LearnPair | undefined {
  return LEARN_PAIRS.find((pair) => pair.slug === slug)
}
