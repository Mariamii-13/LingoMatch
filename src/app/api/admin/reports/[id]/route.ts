import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Report from '@/lib/models/Report'
import { recordModerationAction, type ModerationActionType } from '@/lib/moderation.server'

const SETTABLE_STATUSES = ['reviewed', 'resolved', 'dismissed'] as const

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

/**
 * Moves a report out of the queue. 'open' is deliberately not settable — a
 * report starts there and moderation only ever moves it forward.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const status = (body as { status?: unknown }).status

  if (typeof status !== 'string' || !SETTABLE_STATUSES.includes(status as never)) {
    return NextResponse.json(
      { error: `status must be one of: ${SETTABLE_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  await connectDB()
  const updated = await Report.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean()
  if (!updated) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const actorId = (session.user as { id?: string }).id
  const reportedUserId = (updated as { reportedUser?: { toString(): string } }).reportedUser
  if (actorId && reportedUserId) {
    await recordModerationAction({
      actorId,
      action: `report_${status}` as ModerationActionType,
      targetUserId: reportedUserId.toString(),
      reportId: id,
    })
  }

  return NextResponse.json({ ok: true, status })
}
