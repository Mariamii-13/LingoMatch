import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import MatchRequest from '@/lib/models/MatchRequest'
import Conversation from '@/lib/models/Conversation'
import User from '@/lib/models/User'
import { createRoom } from '@/lib/livekit'

// Requests not polled within this window are considered ghost/disconnected
const GHOST_THRESHOLD_MS = 12_000
// After this long in queue, drop language filters and match any active video searcher
const LANGUAGE_FALLBACK_MS = 5_000

function compatibilityPct(idA: string, idB: string): number {
  const hash = [...(idA + idB)].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return 75 + (hash % 22)
}

function activeFilter() {
  return { $gt: new Date(Date.now() - GHOST_THRESHOLD_MS) }
}

async function createVideoConversation(userId: string, partnerId: string, language: string) {
  const conv = await Conversation.create({
    participants: [userId, partnerId],
    type: 'video',
    language,
    status: 'active',
    livekitRoomName: 'lm-video-placeholder',
  })
  const roomName = `lm-video-${conv._id.toString()}`
  await createRoom(roomName)
  await Conversation.findByIdAndUpdate(conv._id, { livekitRoomName: roomName })
  return conv
}

function buildPartner(doc: Record<string, unknown>) {
  const name = (doc.displayName as string) ?? 'Partner'
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  return {
    id: (doc._id as object).toString(),
    name,
    username: doc.username,
    country: doc.country,
    flag: '',
    avatarInitials: initials,
    avatarColor: 'from-violet-500 to-indigo-500',
    native: doc.nativeLanguages,
    learning: doc.learningLanguages,
    interests: [],
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetLanguage, nativeLanguage, interests = [] } = await req.json()
  if (!targetLanguage || !nativeLanguage)
    return NextResponse.json({ error: 'targetLanguage and nativeLanguage required' }, { status: 400 })

  await connectDB()
  const userId = session.user.id

  // Cancel any stale waiting video request from this user
  await MatchRequest.findOneAndUpdate(
    { userId, type: 'video', status: 'waiting' },
    { $set: { status: 'cancelled' } }
  )

  // Try to match: language pair + candidate must be actively polling
  const existing = await MatchRequest.findOneAndUpdate(
    {
      type: 'video',
      targetLanguage: nativeLanguage,
      nativeLanguage: targetLanguage,
      status: 'waiting',
      userId: { $ne: userId },
      lastPolledAt: activeFilter(),
    },
    { $set: { status: 'matched' } },
    { returnDocument: 'after' }
  )

  if (existing) {
    const partnerDoc = await User.findById(existing.userId).lean() as Record<string, unknown>
    const conv = await createVideoConversation(userId, existing.userId.toString(), targetLanguage)
    existing.conversationId = conv._id
    await existing.save()

    return NextResponse.json({
      matched: true,
      conversationId: conv._id.toString(),
      partner: buildPartner(partnerDoc),
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
    lastPolledAt: new Date(),
  })

  return NextResponse.json({ matched: false, requestId: request._id.toString() })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requestId = req.nextUrl.searchParams.get('requestId')
  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 })

  await connectDB()

  // Heartbeat: mark this user as still actively polling
  const request = await MatchRequest.findOneAndUpdate(
    { _id: requestId, userId: session.user.id },
    { $set: { lastPolledAt: new Date() } },
    { returnDocument: 'after' }
  )

  if (!request) return NextResponse.json({ matched: false, expired: true })
  if (request.status === 'cancelled') return NextResponse.json({ matched: false, cancelled: true })

  if (request.status === 'matched') {
    const conv = await Conversation.findById(request.conversationId).lean() as Record<string, unknown> | null
    if (!conv) return NextResponse.json({ matched: false })

    const participants = conv.participants as { toString(): string }[]
    const partnerId = participants.find((p) => p.toString() !== session.user!.id)
    const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown>

    return NextResponse.json({
      matched: true,
      conversationId: (request.conversationId as object).toString(),
      partner: buildPartner(partnerDoc),
      compatibilityPct: compatibilityPct(session.user.id, partnerId?.toString() ?? ''),
    })
  }

  // Still waiting — check if we should try language-agnostic fallback (after 5s in queue)
  const waitingMs = Date.now() - new Date(request.createdAt as Date).getTime()
  if (waitingMs >= LANGUAGE_FALLBACK_MS) {
    const fallback = await MatchRequest.findOneAndUpdate(
      {
        type: 'video',
        status: 'waiting',
        userId: { $ne: session.user.id },
        lastPolledAt: activeFilter(),
      },
      { $set: { status: 'matched' } },
      { returnDocument: 'after' }
    )

    if (fallback) {
      const partnerDoc = await User.findById(fallback.userId).lean() as Record<string, unknown>
      const language = (request.targetLanguage as string)
      const conv = await createVideoConversation(session.user.id, fallback.userId.toString(), language)

      fallback.conversationId = conv._id
      await fallback.save()

      await MatchRequest.findByIdAndUpdate(requestId, {
        $set: { status: 'matched', conversationId: conv._id },
      })

      return NextResponse.json({
        matched: true,
        conversationId: conv._id.toString(),
        partner: buildPartner(partnerDoc),
        compatibilityPct: compatibilityPct(session.user.id, fallback.userId.toString()),
      })
    }
  }

  return NextResponse.json({ matched: false })
}
