import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { recordModerationAction } from '@/lib/moderation.server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const allowed = ['isBanned', 'banReason', 'role', 'plan', 'isActive']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  await connectDB()

  // Read the prior value so a ban/unban can be told apart and logged — an
  // audit trail of "who banned whom" (technical debt 9.20) needs the
  // transition, not just the new state.
  const before =
    'isBanned' in update
      ? ((await User.findById(id).select('isBanned').lean()) as { isBanned?: boolean } | null)
      : null

  const user = await User.findByIdAndUpdate(id, update, { returnDocument: 'after' }).select(
    '-passwordHash'
  )
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (before && before.isBanned !== update.isBanned) {
    const actorId = (session.user as { id?: string }).id
    if (actorId) {
      await recordModerationAction({
        actorId,
        action: update.isBanned ? 'ban' : 'unban',
        targetUserId: id,
        reason: update.isBanned ? ((update.banReason as string | undefined) ?? null) : null,
      })
    }
  }

  return NextResponse.json(user)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const selfId = (session.user as { id?: string }).id
  if (selfId === id) {
    return NextResponse.json({ error: 'Cannot delete own account' }, { status: 400 })
  }

  await connectDB()
  const user = await User.findByIdAndDelete(id)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true })
}
