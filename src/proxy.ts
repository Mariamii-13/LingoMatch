import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { getLanguageOnboardingRedirect } from '@/lib/onboarding-access'
import { getBanRedirect } from '@/lib/ban-access'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const role = (req.auth?.user as { role?: string })?.role
  const isBanned = (req.auth?.user as { isBanned?: boolean })?.isBanned === true
  const languageProfileComplete =
    (req.auth?.user as { languageProfileComplete?: boolean })?.languageProfileComplete === true

  const publicPaths = ['/', '/login', '/register', '/forgot-password']
  const isPublic =
    publicPaths.includes(pathname) ||
    pathname.startsWith('/api/auth') ||
    // Browsers crash on the signed-out pages too, and a redirect to /login
    // would silently discard exactly those reports.
    pathname.startsWith('/api/observability')

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Checked before the public-path allowances below: a ban must block every
  // protected route immediately (auth.ts refreshes `isBanned` from MongoDB
  // on every request), not just the ones this middleware would otherwise
  // gate for other reasons.
  const banRedirect = getBanRedirect(pathname, isBanned, isPublic)
  if (banRedirect) {
    return NextResponse.redirect(new URL(banRedirect, req.url))
  }

  if (isLoggedIn && !isBanned && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (isLoggedIn && !isBanned) {
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
