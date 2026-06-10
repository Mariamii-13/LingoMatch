import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const role = (req.auth?.user as { role?: string })?.role

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

  const onboardingCompleted = (req.auth?.user as { onboardingCompleted?: boolean })?.onboardingCompleted
  const onboardingPaths = new Set(['/profile', '/languages', '/interests', '/mode', '/ai-preferences'])
  if (isLoggedIn && !onboardingCompleted && !onboardingPaths.has(pathname) && !isPublic && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/profile', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
