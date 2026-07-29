import 'server-only'
import { checkRateLimit } from '@/lib/rateLimit'
import { hashSubject } from '@/lib/request-identity'

/**
 * Limits for the endpoints reachable before sign-in.
 *
 * Both of these run bcrypt, which costs roughly a quarter-second of CPU by
 * design. Unthrottled that is two problems at once: unlimited password guessing,
 * and a cheap way for one client to saturate the server. The ceilings are set
 * well above what a real person does — a few attempts, a typo, a retry — and far
 * below what a script needs.
 */
export const LOGIN_ATTEMPTS_PER_EMAIL = 10
export const LOGIN_ATTEMPTS_PER_IP = 30
export const LOGIN_WINDOW_SECS = 300

export const REGISTRATIONS_PER_IP = 5
export const REGISTER_WINDOW_SECS = 3600

/**
 * Whether a sign-in attempt may proceed.
 *
 * Keyed per email and per address: the email key stops one account being
 * hammered from many addresses, and the address key stops many accounts being
 * probed from one place. Credentials sign-in cannot surface a custom message, so
 * an exceeded limit simply fails the attempt.
 */
export async function allowLoginAttempt(email: string, ip: string): Promise<boolean> {
  const perEmail = await checkRateLimit(
    'login-email',
    hashSubject(email),
    LOGIN_ATTEMPTS_PER_EMAIL,
    LOGIN_WINDOW_SECS,
  )
  if (!perEmail.allowed) return false

  const perIp = await checkRateLimit(
    'login-ip',
    hashSubject(ip),
    LOGIN_ATTEMPTS_PER_IP,
    LOGIN_WINDOW_SECS,
  )
  return perIp.allowed
}

/** Whether an address may create another account. */
export async function allowRegistration(ip: string): Promise<boolean> {
  const { allowed } = await checkRateLimit(
    'register-ip',
    hashSubject(ip),
    REGISTRATIONS_PER_IP,
    REGISTER_WINDOW_SECS,
  )
  return allowed
}
