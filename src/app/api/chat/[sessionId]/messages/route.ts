import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'
import Message from '@/lib/models/Message'

const TYPING_TIMEOUT_MS = 4000

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const after = req.nextUrl.searchParams.get('after')

  await connectDB()

  const conv = await Conversation.findById(sessionId).lean() as Record<string, unknown> | null
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const participants = conv.participants as { toString(): string }[]
  if (!participants.some((p) => p.toString() === session.user!.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partnerId = participants.find((p) => p.toString() !== session.user!.id)?.toString()

  const query: Record<string, unknown> = { conversationId: sessionId }
  if (after) query.createdAt = { $gt: new Date(after) }

  const messages = await Message.find(query)
    .sort({ createdAt: 1 })
    .limit(100)
    .lean()

  const result = messages.map((m) => ({
    id: (m._id as mongoose.Types.ObjectId).toString(),
    senderId: (m.senderId as mongoose.Types.ObjectId).toString(),
    content: m.content as string,
    createdAt: (m.createdAt as Date).toISOString(),
  }))

  // Typing indicator: check if partner typed within TYPING_TIMEOUT_MS
  const typing = conv.typing as Map<string, Date> | Record<string, Date> | undefined
  let partnerTyping = false
  if (partnerId && typing) {
    const lastTyping = typing instanceof Map
      ? typing.get(partnerId)
      : (typing as Record<string, Date>)[partnerId]
    if (lastTyping) {
      partnerTyping = Date.now() - new Date(lastTyping).getTime() < TYPING_TIMEOUT_MS
    }
  }

  return NextResponse.json({
    messages: result,
    sessionStatus: conv.status,
    partnerTyping,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const { content } = await req.json()

  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'content required' }, { status: 400 })
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }

  await connectDB()

  const conv = await Conversation.findById(sessionId).lean() as Record<string, unknown> | null
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (conv.status !== 'active') return NextResponse.json({ error: 'Session ended' }, { status: 410 })

  const participants = conv.participants as { toString(): string }[]
  if (!participants.some((p) => p.toString() === session.user!.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const msg = await Message.create({
    conversationId: sessionId,
    senderId: session.user.id,
    content: content.trim(),
  })

  return NextResponse.json({
    id: (msg._id as mongoose.Types.ObjectId).toString(),
    senderId: session.user.id,
    content: msg.content,
    createdAt: (msg.createdAt as Date).toISOString(),
  })
}
