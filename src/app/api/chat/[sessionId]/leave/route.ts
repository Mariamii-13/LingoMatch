import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  await connectDB()

  const now = new Date()
  // Returns pre-update doc (has startedAt we need for duration)
  const conv = await Conversation.findOneAndUpdate(
    { _id: sessionId, participants: session.user.id, status: 'active' },
    { $set: { status: 'ended', endedAt: now } }
  ).lean() as Record<string, unknown> | null

  if (!conv) return NextResponse.json({ error: 'Not found or already ended' }, { status: 404 })

  const durationSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(conv.startedAt as Date).getTime()) / 1000)
  )
  await Conversation.findByIdAndUpdate(sessionId, { $set: { durationSeconds } })

  return NextResponse.json({ ok: true })
}
