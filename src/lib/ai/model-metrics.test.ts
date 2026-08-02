import { describe, it, expect, vi, afterEach } from 'vitest'
import { logModelMetric } from './model-metrics'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('logModelMetric', () => {
  it('logs one line prefixed lm-model-metric, grep-able in runtime logs', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logModelMetric({ modelId: 'some/model', gateway: 'openrouter', outcome: 'success' })
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toMatch(/^lm-model-metric /)
  })

  it('carries every field through as valid JSON', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logModelMetric({
      modelId: 'some/model',
      gateway: 'openrouter',
      tier: 'free',
      latencyMs: 1234,
      ttftMs: 567,
      outcome: 'repaired',
      costUsd: 0.002,
      explanationLanguageCorrect: true,
    })
    const line = spy.mock.calls[0][0] as string
    const parsed = JSON.parse(line.replace(/^lm-model-metric /, ''))
    expect(parsed).toEqual({
      modelId: 'some/model',
      gateway: 'openrouter',
      tier: 'free',
      latencyMs: 1234,
      ttftMs: 567,
      outcome: 'repaired',
      costUsd: 0.002,
      explanationLanguageCorrect: true,
    })
  })

  it('omits optional fields rather than fabricating a value when they are unset', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    logModelMetric({ modelId: 'some/model', gateway: 'openrouter', outcome: 'advanced' })
    const line = spy.mock.calls[0][0] as string
    const parsed = JSON.parse(line.replace(/^lm-model-metric /, ''))
    expect(parsed).toEqual({ modelId: 'some/model', gateway: 'openrouter', outcome: 'advanced' })
  })
})
