import { describe, expect, it } from 'vitest'
import { getLanguageOnboardingRedirect } from './onboarding-access'

describe('getLanguageOnboardingRedirect', () => {
  it('redirects incomplete users away from application pages', () => {
    expect(getLanguageOnboardingRedirect('/dashboard', false, 'user')).toBe('/languages')
    expect(getLanguageOnboardingRedirect('/ai-practice', false, 'user')).toBe('/languages')
  })

  it('allows onboarding, API, and admin recovery paths', () => {
    expect(getLanguageOnboardingRedirect('/languages', false, 'user')).toBeNull()
    expect(getLanguageOnboardingRedirect('/profile', false, 'user')).toBeNull()
    expect(getLanguageOnboardingRedirect('/api/user/me/language-profile', false, 'user')).toBeNull()
    expect(getLanguageOnboardingRedirect('/admin/dashboard', false, 'admin')).toBeNull()
    expect(getLanguageOnboardingRedirect('/dashboard', false, 'admin')).toBe('/languages')
  })

  it('does not redirect complete users', () => {
    expect(getLanguageOnboardingRedirect('/dashboard', true, 'user')).toBeNull()
  })
})
