import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import MatchRequest from '@/lib/models/MatchRequest'
import Conversation from '@/lib/models/Conversation'
import User from '@/lib/models/User'
import { createRoom } from '@/lib/livekit'

function compatibilityPct(idA: string, idB: string): number {
  const hash = [...(idA + idB)].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return 75 + (hash % 22)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetLanguage, nativeLanguage, interests = [] } = await req.json()
  if (!targetLanguage || !nativeLanguage)
    return NextResponse.json({ error: 'targetLanguage and nativeLanguage required' }, { status: 400 })

  await connectDB()
  const userId = session.user.id

  const existing = await MatchRequest.findOneAndUpdate(
    {
      type: 'video',
      targetLanguage: nativeLanguage,
      nativeLanguage: targetLanguage,
      status: 'waiting',
      userId: { $ne: userId },
    },
    { $set: { status: 'matched' } },
    { returnDocument: 'after' }
  )

  if (existing) {
    const partnerDoc = await User.findById(existing.userId).lean() as Record<string, unknown>
    const conv = await Conversation.create({
      participants: [userId, existing.userId],
      type: 'video',
      language: targetLanguage,
      status: 'active',
      livekitRoomName: 'lm-video-placeholder',
    })
    const livekitRoomName = `lm-video-${conv._id.toString()}`
    await createRoom(livekitRoomName)
    await Conversation.findByIdAndUpdate(conv._id, { livekitRoomName })
    existing.conversationId = conv._id
    await existing.save()

    const name = (partnerDoc.displayName as string) ?? 'Partner'
    const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

    return NextResponse.json({
      matched: true,
      conversationId: conv._id.toString(),
      partner: {
        id: (partnerDoc._id as object).toString(),
        name,
        username: partnerDoc.username,
        country: partnerDoc.country,
        flag: '',
        avatarInitials: initials,
        avatarColor: 'from-violet-500 to-indigo-500',
        native: partnerDoc.nativeLanguages,
        learning: partnerDoc.learningLanguages,
        interests: [],
      },
      compatibilityPct: compatibilityPct(userId, existing.userId.toString()),
    })
  }

  const request = await MatchRequest.create({
    userId,
    type: 'video',
    targetLanguage,
    nativeLanguage,
    interests,
    status: 'waiting',
  })

  return NextResponse.json({ matched: false, requestId: request._id.toString() })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requestId = req.nextUrl.searchParams.get('requestId')
  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 })

  await connectDB()

  const request = await MatchRequest.findById(requestId).lean() as Record<string, unknown> | null
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (request.status !== 'matched') return NextResponse.json({ matched: false })

  const conv = await Conversation.findById(request.conversationId).lean() as Record<string, unknown>
  const participants = conv.participants as { toString(): string }[]
  const partnerId = participants.find((p) => p.toString() !== session.user!.id)
  const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown>

  const name = (partnerDoc.displayName as string) ?? 'Partner'
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return NextResponse.json({
    matched: true,
    conversationId: (request.conversationId as object).toString(),
    partner: {
      id: (partnerDoc._id as object).toString(),
      name,
      username: partnerDoc.username,
      country: partnerDoc.country,
      flag: '',
      avatarInitials: initials,
      avatarColor: 'from-violet-500 to-indigo-500',
      native: partnerDoc.nativeLanguages,
      learning: partnerDoc.learningLanguages,
      interests: [],
    },
    compatibilityPct: compatibilityPct(session.user.id, partnerId?.toString() ?? ''),
  })
}
