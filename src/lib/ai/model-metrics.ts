import 'server-only'
import type { ModelTier } from './model-registry'

/**
 * Roadmap #35 (passport §21.4 Phase 1). The prerequisite for any
 * evidence-driven routing decision (§21.4 Phase 2) — without this, "choose
 * intelligently using real production evidence" has no evidence to use.
 * Reuses 3.34's existing structured-log pattern (plain `console.log`,
 * grep-able prefix) rather than a new observability vendor, exactly the way
 * 11.27's reasoning already settled for error reporting.
 */

export type ModelMetricOutcome = 'success' | 'advanced' | 'repaired' | 'failed'

export type ModelMetric = {
  modelId: string
  gateway: 'openrouter'
  /** Omitted when the caller didn't pass a tier (pre-§20.5 callers) — never fabricated. */
  tier?: ModelTier
  /** Omitted for metric lines that aren't reporting a fresh attempt's timing (e.g. the explanation-language enrichment line). */
  latencyMs?: number
  /** Time to first streamed token, streaming callers only. */
  ttftMs?: number
  outcome: ModelMetricOutcome
  /** From `usage.cost` when the gateway reports it — OpenRouter does not reliably report cost on streamed responses; omitted rather than guessed. */
  costUsd?: number
  /** Roadmap #28/§19.6.1's independent language check, once an explanation exists to check. */
  explanationLanguageCorrect?: boolean
}

const METRIC_LOG_PREFIX = 'lm-model-metric'

/** One line per model attempt. `grep lm-model-metric` in runtime logs finds every one this application has made. */
export function logModelMetric(metric: ModelMetric): void {
  console.log(`${METRIC_LOG_PREFIX} ${JSON.stringify(metric)}`)
}
