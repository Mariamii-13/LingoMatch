import 'server-only'
import nodemailer from 'nodemailer'

/**
 * Sends the password-reset email over Gmail SMTP.
 *
 * Missing credentials throw rather than no-op: unlike the optional
 * observability webhook, email delivery is this feature's whole point, and
 * a swallowed failure here would mean reset links silently stop arriving
 * with nothing in the logs to explain why. The route handler that calls
 * this turns the throw into an opaque 500 via internalErrorResponse.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error('Gmail credentials are not configured (GMAIL_USER / GMAIL_APP_PASSWORD)')
  }

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })

  await transporter.sendMail({
    from: user,
    to,
    subject: 'Reset your LingoMatch password',
    text: `Reset your password by visiting this link:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email — your password will not change.`,
    html: `<p>Reset your password by clicking the link below:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email — your password will not change.</p>`,
  })
}
