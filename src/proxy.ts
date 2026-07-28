import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { getLanguageOnboardingRedirect } from '@/lib/onboarding-access'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const role = (req.auth?.user as { role?: string })?.role
  const languageProfileComplete =
    (req.auth?.user as { languageProfileComplete?: boolean })?.languageProfileComplete === true

  const publicPaths = ['/', '/login', '/register', '/verify-email', '/forgot-password']
  const isPublic = publicPaths.includes(pathname) || pathname.startsWith('/api/auth')

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (isLoggedIn) {
    const onboardingRedirect = getLanguageOnboardingRedirect(
      pathname,
      languageProfileComplete,
      role,
    )
    if (onboardingRedirect) {
      return NextResponse.redirect(new URL(onboardingRedirect, req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
