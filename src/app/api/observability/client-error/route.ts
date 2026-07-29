import { NextRequest, NextResponse } from 'next/server'

import { reportClientError } from '@/lib/observability/report.server'
import { checkRateLimit } from '@/lib/rateLimit'
import { getClientIp, hashSubject } from '@/lib/request-identity'
import { clientErrorReportSchema } from '@/lib/validations/client-error'

/**
 * Receives failures the browser caught, so a crash the user sees is a crash an
 * operator can find.
 *
 * Reachable without signing in on purpose: the landing page, the sign-in form
 * and the onboarding steps are where a broken build hurts most, and nobody is
 * authenticated there.
 */

/** Bigger than any real report; small enough that this cannot be a file upload. */
const MAX_BODY_BYTES = 16_000

/** Per address, matching the browser-side cap of five reports per page load. */
const REPORT_LIMIT = 30
const REPORT_WINDOW_SECS = 300

export async function POST(req: NextRequest) {
  const declaredLength = Number(req.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  // There is no user id to key on here, and the raw address is not stored:
  // hashSubject keeps the limit workable without keeping personal data.
  const { allowed } = await checkRateLimit(
    'client-error',
    hashSubject(getClientIp(req.headers)),
    REPORT_LIMIT,
    REPORT_WINDOW_SECS
  )
  if (!allowed) {
    return new NextResponse(null, { status: 429 })
  }

  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = clientErrorReportSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid report' }, { status: 400 })
  }

  const { kind, name, message, stack, digest, path } = parsed.data

  const error = new Error(message)
  error.name = name || 'ClientError'
  if (stack) error.stack = stack

  reportClientError(`browser ${kind}`, error, {
    digest,
    request: { path, method: req.method, headers: req.headers },
  })

  // Nothing to say back: the browser is already in a failure path.
  return new NextResponse(null, { status: 204 })
}
