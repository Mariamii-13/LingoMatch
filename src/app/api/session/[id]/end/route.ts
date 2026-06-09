import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id } = await params

  const conv = await Conversation.findById(id)
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const participantIds = conv.participants.map((p: { toString(): string }) => p.toString())
  if (!participantIds.includes(session.user.id))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date()
  const durationSeconds = Math.round((now.getTime() - conv.startedAt.getTime()) / 1000)

  await Conversation.findByIdAndUpdate(id, {
    status: 'ended',
    endedAt: now,
    durationSeconds,
  })

  return NextResponse.json({ ok: true, durationSeconds })
}
