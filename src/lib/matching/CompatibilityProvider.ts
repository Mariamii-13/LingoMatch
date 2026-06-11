export interface MatchCandidate {
  userId: string
  targetLanguage: string
  nativeLanguage: string
  countryPreference: string
  interests: string[]
}

export interface CompatibilityResult {
  /** 0–100 compatibility score */
  score: number
  /** Human-readable reasons driving the score (used for debugging / future UI) */
  reasons: string[]
}

/**
 * Implement this interface to swap in a new matching algorithm.
 * The active provider is exported from src/lib/matching/index.ts.
 * Switching from rule-based to AI requires only changing that export.
 */
export interface CompatibilityProvider {
  readonly name: string
  score(a: MatchCandidate, b: MatchCandidate): Promise<CompatibilityResult>
}
