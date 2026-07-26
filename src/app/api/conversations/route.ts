import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'
import MessageModel from '@/lib/models/Message'
import User from '@/lib/models/User'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const userId = session.user.id

  const convs = await Conversation.find({ participants: userId }).sort({ updatedAt: -1 }).lean()

  const shaped = await Promise.all(
    convs.map(async (conv) => {
      const participants = conv.participants as { toString(): string }[]
      const partnerId = participants.find((p) => p.toString() !== userId)
      const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown> | null
      const name = (partnerDoc?.displayName as string) ?? 'Unknown'

      const lastMsg = await MessageModel.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 })
        .lean()

      return {
        id: (conv._id as object).toString(),
        type: conv.type,
        partner: {
          id: partnerDoc ? (partnerDoc._id as object).toString() : '',
          name,
          username: (partnerDoc?.username as string) ?? '',
          avatar: (partnerDoc?.avatar as string) ?? '',
          flag: '',
          avatarInitials: name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
          avatarColor: 'from-violet-500 to-indigo-500',
        },
        language: conv.language,
        status: conv.status,
        lastMessage: lastMsg
          ? { content: lastMsg.content, createdAt: (lastMsg.createdAt as Date).toISOString() }
          : null,
        unreadCount: 0,
        startedAt: conv.startedAt.toISOString(),
      }
    })
  )

  return NextResponse.json({ conversations: shaped })
}
