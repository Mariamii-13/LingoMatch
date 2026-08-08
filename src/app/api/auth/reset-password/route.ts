import { NextRequest, NextResponse } from 'next/server'
import { ResetPasswordSchema } from '@/lib/validations/auth'
import { allowPasswordResetAttempt } from '@/lib/auth-throttle'
import { getClientIp } from '@/lib/request-identity'
import { performPasswordReset } from '@/lib/password-reset.server'
import { internalErrorResponse } from '@/lib/observability/report.server'

export async function POST(req: NextRequest) {
  try {
    // Checked first, and cheaply, since a token-guessing script would
    // otherwise get unlimited bcrypt-cost attempts against every guess.
    if (!(await allowPasswordResetAttempt(getClientIp(req.headers)))) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = ResetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json({ error: issue?.message ?? 'Invalid input' }, { status: 400 })
    }
    const { token, password } = parsed.data

    const result = await performPasswordReset(token, password)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 })
  } catch (error) {
    return internalErrorResponse('auth/reset-password POST', error)
  }
}
