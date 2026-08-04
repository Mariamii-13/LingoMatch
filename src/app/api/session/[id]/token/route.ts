import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'
import { generateToken } from '@/lib/livekit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id } = await params

  const conv = await Conversation.findById(id)
  if (!conv || (conv.type !== 'video' && conv.type !== 'voice'))
    return NextResponse.json({ error: 'Video conversation not found' }, { status: 404 })

  const participantIds = conv.participants.map((p: { toString(): string }) => p.toString())
  if (!participantIds.includes(session.user.id))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const roomName = conv.livekitRoomName ?? `lm-video-${id}`

  const token = await generateToken({
    identity: session.user.id,
    name: session.user.name ?? 'User',
    roomName,
    ttl: 3600,
  })

  return NextResponse.json({ token, roomName, serverUrl: process.env.LIVEKIT_URL })
}
