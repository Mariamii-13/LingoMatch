import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import MessageModel from '@/lib/models/Message'
import Conversation from '@/lib/models/Conversation'
import User from '@/lib/models/User'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id } = await params

  const messages = await MessageModel.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .lean()

  const senderIds = [...new Set(messages.map((m) => m.senderId.toString()))]
  const users = await User.find({ _id: { $in: senderIds } }).lean() as Record<string, unknown>[]
  const userMap = Object.fromEntries(users.map((u) => [(u._id as object).toString(), u]))

  const shaped = messages.map((m) => {
    const sender = userMap[m.senderId.toString()] ?? {}
    const name = (sender.displayName as string) ?? 'Unknown'
    return {
      id: (m._id as object).toString(),
      conversationId: id,
      senderId: m.senderId.toString(),
      senderName: name,
      senderInitials: name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
      senderAvatarColor: 'from-violet-500 to-indigo-500',
      content: m.content,
      createdAt: (m.createdAt as Date).toISOString(),
    }
  })

  return NextResponse.json({ messages: shaped })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

  await connectDB()
  const { id } = await params

  const conv = await Conversation.findById(id)
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })

  const participantIds = conv.participants.map((p: { toString(): string }) => p.toString())
  if (!participantIds.includes(session.user.id))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const msg = await MessageModel.create({
    conversationId: id,
    senderId: session.user.id,
    content: content.trim(),
  })

  return NextResponse.json({
    message: {
      id: msg._id.toString(),
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    },
  })
}
