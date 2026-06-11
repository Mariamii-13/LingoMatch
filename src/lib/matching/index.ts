import type { CompatibilityProvider } from './CompatibilityProvider'
import { RuleBasedProvider } from './RuleBasedProvider'

/**
 * Active compatibility provider.
 * To switch to AI-powered matching, replace RuleBasedProvider with your AI provider.
 * The provider is instantiated once per worker (singleton).
 */
const activeProvider: CompatibilityProvider = new RuleBasedProvider()

export { activeProvider }
export type {
  CompatibilityProvider,
  CompatibilityResult,
  MatchCandidate,
} from './CompatibilityProvider'
