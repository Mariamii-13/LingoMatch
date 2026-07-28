import 'server-only'

export type ModelRole =
  | 'defaultTutor'
  | 'freeTutor'
  | 'budgetTutor'
  | 'advancedTutor'
  | 'grammarTutor'
  | 'fallbackTutor'

/**
 * Zero-cost OpenRouter models, ordered by measured tutor quality and latency.
 * These are the safety net: the tutor keeps working even when the configured
 * model is unavailable, unaffordable, or rate-limited upstream.
 */
export const FREE_TUTOR_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
] as const

function parseList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

/**
 * The ordered list of models to try for a role.
 *
 * `AI_MODEL_DEFAULT` goes first so an operator can pin a preferred model, then
 * any `AI_MODEL_FALLBACKS`, then the built-in free models. Callers walk the list
 * until one answers, which is what keeps a paid-model misconfiguration (expired
 * key, empty credit balance, retired model id) from taking the tutor offline.
 */
export function resolveModelChain(role: ModelRole = 'defaultTutor'): string[] {
  void role // All roles share one chain until per-role models are provisioned.

  const chain = [
    ...parseList(process.env.AI_MODEL_DEFAULT),
    ...parseList(process.env.AI_MODEL_FALLBACKS),
    ...FREE_TUTOR_MODELS,
  ]

  return [...new Set(chain)]
}

export function resolveModel(role: ModelRole = 'defaultTutor'): string {
  const [first] = resolveModelChain(role)
  if (!first) {
    throw new Error('No AI model is configured')
  }
  return first
}
