import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDueReviews, recordReviewOutcome } from '@/lib/skill-review.server'

/**
 * Roadmap #31 — the spaced-repetition review deck's API. Body-based POST
 * (not `/api/review/[id]`) matching the established convention for small
 * per-user mutations (`/api/users/block`, `/api/friends/request`) rather
 * than adding a new dynamic segment.
 */

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await getDueReviews(session.user.id)
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const reviewId = (body as { reviewId?: unknown }).reviewId
  const remembered = (body as { remembered?: unknown }).remembered

  if (typeof reviewId !== 'string' || !reviewId) {
    return NextResponse.json({ error: 'reviewId required' }, { status: 400 })
  }
  if (typeof remembered !== 'boolean') {
    return NextResponse.json({ error: 'remembered must be a boolean' }, { status: 400 })
  }

  try {
    const ok = await recordReviewOutcome({ userId: session.user.id, reviewId, remembered })
    if (!ok) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    // A malformed reviewId reaches Mongoose as a CastError, not a missing
    // document — same externally-visible outcome (this review doesn't exist
    // for this caller), so it gets the same 404 rather than a raw 500.
    return NextResponse.json({ error: 'Review not found' }, { status: 404 })
  }
}
