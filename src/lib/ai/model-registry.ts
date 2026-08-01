import 'server-only'
import { FREE_TUTOR_MODELS } from './models'

/**
 * Roadmap #34 (passport §21.4, Phase 1). Scoped deliberately: this ships the
 * registry and the tier-eligibility hard filter — the piece that makes
 * §20.5's "the free tier must never reach the paid model chain" guarantee a
 * real mechanism instead of an env-var convention. The circuit breaker and
 * production metrics logging §21.4 Phase 1 also describes are not part of
 * this change; see the passport for what remains.
 */

export type ModelTier = 'free' | 'trial' | 'paid'

export type ModelRegistryEntry = {
  modelId: string
  gateway: 'openrouter'
  /** Which caller tiers may reach this model. Checked before anything else — never a weighted signal. */
  tierEligibility: ModelTier[]
  /** Lower tries first. Mirrors today's env-then-free ordering. */
  priority: number
}

function parseEnvChain(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

/**
 * The model registry: env-configured models (paid, in practice) are only
 * eligible for 'trial'/'paid' callers — a 'free' caller never reaches them,
 * regardless of latency, quality, or any other signal a future scored router
 * (§21.4 Phase 2) might add. `FREE_TUTOR_MODELS` are eligible for everyone,
 * unchanged from today. Deduplicated by model id, keeping the
 * highest-precedence (lowest priority number) occurrence — same rule
 * `resolveModelChain()` already applies via `Set`.
 */
export function buildModelRegistry(): ModelRegistryEntry[] {
  const paidChain = [
    ...parseEnvChain(process.env.AI_MODEL_DEFAULT),
    ...parseEnvChain(process.env.AI_MODEL_FALLBACKS),
  ]

  const entries: ModelRegistryEntry[] = []
  let priority = 0

  for (const modelId of paidChain) {
    entries.push({ modelId, gateway: 'openrouter', tierEligibility: ['trial', 'paid'], priority: priority++ })
  }
  for (const modelId of FREE_TUTOR_MODELS) {
    entries.push({
      modelId,
      gateway: 'openrouter',
      tierEligibility: ['free', 'trial', 'paid'],
      priority: priority++,
    })
  }

  const seen = new Set<string>()
  return entries.filter((entry) => {
    if (seen.has(entry.modelId)) return false
    seen.add(entry.modelId)
    return true
  })
}

/**
 * The ordered list of model ids eligible for `tier`, hard-filtered before
 * anything else runs (§21.3, Layer 3 step 1). A 'free' caller with no paid
 * models configured, or with only `FREE_TUTOR_MODELS` eligible, still gets a
 * correct (shorter) chain — this is the mechanism, not just the policy.
 */
export function resolveChainForTier(tier: ModelTier): string[] {
  return buildModelRegistry()
    .filter((entry) => entry.tierEligibility.includes(tier))
    .sort((a, b) => a.priority - b.priority)
    .map((entry) => entry.modelId)
}
