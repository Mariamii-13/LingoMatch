import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildModelRegistry, resolveChainForTier } from './model-registry'
import { FREE_TUTOR_MODELS } from './models'

beforeEach(() => {
  delete process.env.AI_MODEL_DEFAULT
  delete process.env.AI_MODEL_FALLBACKS
})

afterEach(() => {
  delete process.env.AI_MODEL_DEFAULT
  delete process.env.AI_MODEL_FALLBACKS
})

describe('buildModelRegistry', () => {
  it('marks env-configured models eligible only for trial/paid', () => {
    process.env.AI_MODEL_DEFAULT = 'some/paid-model'
    const registry = buildModelRegistry()
    const entry = registry.find((e) => e.modelId === 'some/paid-model')
    expect(entry?.tierEligibility).toEqual(['trial', 'paid'])
  })

  it('marks every FREE_TUTOR_MODELS entry eligible for all tiers', () => {
    const registry = buildModelRegistry()
    for (const modelId of FREE_TUTOR_MODELS) {
      const entry = registry.find((e) => e.modelId === modelId)
      expect(entry?.tierEligibility).toEqual(['free', 'trial', 'paid'])
    }
  })

  it('orders env-configured models before the free chain', () => {
    process.env.AI_MODEL_DEFAULT = 'some/paid-model'
    const registry = buildModelRegistry()
    const paidIndex = registry.findIndex((e) => e.modelId === 'some/paid-model')
    const firstFreeIndex = registry.findIndex((e) => e.modelId === FREE_TUTOR_MODELS[0])
    expect(paidIndex).toBeLessThan(firstFreeIndex)
  })

  it('deduplicates when an env var repeats a free model, keeping it at its first (highest-precedence) position', () => {
    process.env.AI_MODEL_DEFAULT = FREE_TUTOR_MODELS[0]
    const registry = buildModelRegistry()
    const occurrences = registry.filter((e) => e.modelId === FREE_TUTOR_MODELS[0])
    expect(occurrences.length).toBe(1)
    // The env-configured occurrence wins, so it carries the wider (paid-included)
    // eligibility rather than being silently dropped in favour of the free-only one.
    expect(occurrences[0].tierEligibility).toEqual(['trial', 'paid'])
  })

  it('produces only the free chain when no env models are configured', () => {
    const registry = buildModelRegistry()
    expect(registry.map((e) => e.modelId)).toEqual([...FREE_TUTOR_MODELS])
  })
})

describe('resolveChainForTier', () => {
  it('excludes env-configured (paid) models for a free-tier caller', () => {
    process.env.AI_MODEL_DEFAULT = 'some/paid-model'
    process.env.AI_MODEL_FALLBACKS = 'some/paid-fallback'
    const chain = resolveChainForTier('free')
    expect(chain).not.toContain('some/paid-model')
    expect(chain).not.toContain('some/paid-fallback')
    expect(chain).toEqual([...FREE_TUTOR_MODELS])
  })

  it('includes env-configured models, in order, before the free chain for a paid-tier caller', () => {
    process.env.AI_MODEL_DEFAULT = 'some/paid-model'
    process.env.AI_MODEL_FALLBACKS = 'some/paid-fallback'
    const chain = resolveChainForTier('paid')
    expect(chain).toEqual(['some/paid-model', 'some/paid-fallback', ...FREE_TUTOR_MODELS])
  })

  it('treats trial the same as paid (both reach env-configured models)', () => {
    process.env.AI_MODEL_DEFAULT = 'some/paid-model'
    const chain = resolveChainForTier('trial')
    expect(chain).toContain('some/paid-model')
  })

  it('never returns an empty chain for free when no paid models are configured (the free safety net always exists)', () => {
    expect(resolveChainForTier('free')).toEqual([...FREE_TUTOR_MODELS])
  })
})
