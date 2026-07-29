import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { blockUser, unblockUser } from '@/lib/blocking.server'

// Body-based, not /api/users/[id]/block, because Next's App Router requires
// every dynamic segment at a given path level to share one slug name, and
// this level is already `[username]` (src/app/api/users/[username]/route.ts).
// Matches the existing /api/friends/request convention (also body-based)
// rather than fighting the router over segment naming.

async function readTargetId(req: NextRequest): Promise<string | null> {
  const body = await req.json().catch(() => ({}))
  const targetUserId = (body as { targetUserId?: unknown }).targetUserId
  return typeof targetUserId === 'string' && targetUserId ? targetUserId : null
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const targetId = await readTargetId(req)
  if (!targetId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })
  if (targetId === session.user.id) {
    return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
  }

  await connectDB()
  const target = await User.findById(targetId).select('_id').lean()
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await blockUser(session.user.id, targetId)

  return NextResponse.json({ ok: true, blocked: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const targetId = await readTargetId(req)
  if (!targetId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })

  await connectDB()
  await unblockUser(session.user.id, targetId)

  return NextResponse.json({ ok: true, blocked: false })
}
