const ONBOARDING_PATHS = new Set([
  '/profile',
  '/ai-preferences',
  '/languages',
  '/interests',
  '/mode',
])

export function getLanguageOnboardingRedirect(
  pathname: string,
  languageProfileComplete: boolean,
  role?: string,
): '/languages' | null {
  if (languageProfileComplete || (role === 'admin' && pathname.startsWith('/admin'))) return null
  if (pathname.startsWith('/api/') || ONBOARDING_PATHS.has(pathname)) return null
  return '/languages'
}
