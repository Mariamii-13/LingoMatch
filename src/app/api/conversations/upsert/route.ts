import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'
import User from '@/lib/models/User'
import { avatarGradient } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipientId } = await req.json()
  if (!recipientId) return NextResponse.json({ error: 'recipientId required' }, { status: 400 })

  const myId = session.user.id
  if (recipientId === myId) {
    return NextResponse.json({ error: 'Cannot chat with yourself' }, { status: 400 })
  }

  await connectDB()

  const recipient = await User.findById(recipientId).select('displayName username').lean() as Record<string, unknown> | null
  if (!recipient) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Find existing DM conversation (language='any' marks direct messages vs match sessions)
  let conv = await Conversation.findOne({
    participants: {
      $all: [
        new mongoose.Types.ObjectId(myId),
        new mongoose.Types.ObjectId(recipientId),
      ],
    },
    language: 'any',
  }).lean() as Record<string, unknown> | null

  if (!conv) {
    const created = await Conversation.create({
      participants: [myId, recipientId],
      type: 'chat',
      language: 'any',
      status: 'active',
    })
    conv = created.toObject() as Record<string, unknown>
  }

  const name = (recipient.displayName as string) ?? 'Unknown'
  const username = (recipient.username as string) ?? ''

  return NextResponse.json({
    id: (conv._id as object).toString(),
    type: conv.type,
    partner: {
      id: recipientId,
      name,
      username,
      avatarInitials: name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      avatarColor: avatarGradient(username),
    },
    language: conv.language,
    status: conv.status,
    lastMessage: null,
    unreadCount: 0,
    startedAt: (conv.startedAt as Date).toISOString(),
  })
}
