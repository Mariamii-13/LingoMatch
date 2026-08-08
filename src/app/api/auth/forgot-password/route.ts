import { NextRequest, NextResponse } from 'next/server'
import { ForgotPasswordSchema } from '@/lib/validations/auth'
import { allowPasswordResetRequest } from '@/lib/auth-throttle'
import { getClientIp } from '@/lib/request-identity'
import { requestPasswordReset } from '@/lib/password-reset.server'
import { internalErrorResponse } from '@/lib/observability/report.server'

// Identical for every outcome except validation failure and a genuine
// server error — an existing account, a nonexistent one, and a
// rate-limited request must all look the same from the outside.
const GENERIC_RESPONSE = { message: 'If an account exists for that email, a reset link has been sent.' }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ForgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json({ error: issue?.message ?? 'Invalid input' }, { status: 400 })
    }
    const { email } = parsed.data

    const allowed = await allowPasswordResetRequest(email, getClientIp(req.headers))
    if (!allowed) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
    }

    await requestPasswordReset(email)
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
  } catch (error) {
    return internalErrorResponse('auth/forgot-password POST', error)
  }
}
