import 'server-only'
import { createHash } from 'crypto'

/**
 * Identifies the caller of an unauthenticated request, for rate limiting.
 *
 * There is no user id to key on before sign-in, so the client address is used
 * instead. Behind Vercel the first entry of x-forwarded-for is the real client;
 * later entries are proxies and must not be trusted as the origin.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * Turns an identifier into a rate-limit key without storing the identifier.
 *
 * Rate-limit documents persist for the length of their window, so keying them
 * on a raw address or email address would mean storing personal data to solve
 * an abuse problem. Hashing with the app secret keeps the key stable and
 * comparable but not reversible, and unusable outside this deployment.
 */
export function hashSubject(value: string): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
  return createHash('sha256').update(`${secret}:${value.toLowerCase()}`).digest('hex').slice(0, 32)
}
