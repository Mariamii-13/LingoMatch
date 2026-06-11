import type {
  CompatibilityProvider,
  CompatibilityResult,
  MatchCandidate,
} from './CompatibilityProvider'

/**
 * Rule-based compatibility scorer.
 * Language pair match is enforced at query level; this refines the score
 * based on shared interests and country preference alignment.
 */
export class RuleBasedProvider implements CompatibilityProvider {
  readonly name = 'rule-based' as const

  async score(
    a: MatchCandidate,
    b: MatchCandidate
  ): Promise<CompatibilityResult> {
    let score = 72
    const reasons: string[] = ['Language pair matched']

    const sharedInterests = a.interests.filter((i) => b.interests.includes(i))
    if (sharedInterests.length >= 3) {
      score += 15
      reasons.push(`${sharedInterests.length} shared interests`)
    } else if (sharedInterests.length >= 1) {
      score += 8
      reasons.push(`${sharedInterests.length} shared interest`)
    }

    if (
      a.countryPreference &&
      b.countryPreference &&
      a.countryPreference === b.countryPreference
    ) {
      score += 10
      reasons.push('Same country preference')
    }

    return { score: Math.min(100, score), reasons }
  }
}
