import 'server-only'
import { randomBytes, createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { sendPasswordResetEmail } from '@/lib/mail'

/** 1 hour — short enough to limit exposure, long enough for a real email check. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

/** SHA-256 of the raw token. Only this is ever persisted or logged. */
export function hashResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Issues a reset token and emails it, if the email belongs to an account.
 *
 * Silently does nothing for an unknown email — the caller (the route
 * handler) always responds with the same generic message either way, so
 * this function's silence is what keeps account existence unobservable.
 * Works identically for Google-only accounts (no existing passwordHash):
 * completing the reset gives them their first password.
 *
 * An email-send failure is a real operational problem (misconfigured
 * Gmail, SMTP outage) and is deliberately NOT caught here — it propagates
 * so the route handler surfaces an opaque 500 instead of a false "sent".
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await connectDB()
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return

  const rawToken = randomBytes(32).toString('hex')
  user.resetTokenHash = hashResetToken(rawToken)
  user.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)
  await user.save()

  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`
  await sendPasswordResetEmail(user.email, resetUrl)
}

export type PasswordResetResult = { success: true } | { success: false; reason: 'invalid-or-expired' }

/**
 * Verifies a reset token and, if valid, sets it as the account's new
 * password. Single-use: the token fields are cleared in the same save
 * that sets the new passwordHash, so a second attempt with the same raw
 * token always falls into the "invalid-or-expired" branch.
 */
export async function performPasswordReset(token: string, password: string): Promise<PasswordResetResult> {
  await connectDB()
  const user = await User.findOne({
    resetTokenHash: hashResetToken(token),
    resetTokenExpiresAt: { $gt: new Date() },
  })
  if (!user) return { success: false, reason: 'invalid-or-expired' }

  user.passwordHash = await bcrypt.hash(password, 12)
  user.resetTokenHash = null
  user.resetTokenExpiresAt = null
  await user.save()

  return { success: true }
}
