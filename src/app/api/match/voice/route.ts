import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import MatchRequest from '@/lib/models/MatchRequest'
import Conversation from '@/lib/models/Conversation'
import User from '@/lib/models/User'
import { createRoom } from '@/lib/livekit'
import { matchRequestSchema } from '@/lib/validations/match'
import { checkRateLimit } from '@/lib/rateLimit'
import { getBlockedUserIds } from '@/lib/blocking.server'
import { buildMatchPartner as buildPartner, MATCH_PARTNER_SELECT } from '@/lib/match-partner.server'

// Same liveness/fallback constants as the video route (18.5: voice reuses
// video's matching mechanics, not chat's) — a voice room is video minus the
// camera track, not a different queue model.
const GHOST_THRESHOLD_MS = 12_000
const LANGUAGE_FALLBACK_MS = 5_000

function compatibilityPct(idA: string, idB: string): number {
  const hash = [...(idA + idB)].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return 75 + (hash % 22)
}

function activeFilter() {
  return { $gt: new Date(Date.now() - GHOST_THRESHOLD_MS) }
}

async function createVoiceConversation(userId: string, partnerId: string, language: string) {
  const conv = await Conversation.create({
    participants: [userId, partnerId],
    type: 'voice',
    language,
    status: 'active',
    livekitRoomName: 'lm-voice-placeholder',
  })
  const roomName = `lm-voice-${conv._id.toString()}`
  await createRoom(roomName)
  await Conversation.findByIdAndUpdate(conv._id, { livekitRoomName: roomName })
  return conv
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = matchRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid match request' },
      { status: 400 },
    )
  }
  const { targetLanguage, nativeLanguage, interests } = parsed.data

  const { allowed } = await checkRateLimit('match-queue-voice', session.user.id, 5, 60)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many match requests. Wait a moment before trying again.' },
      { status: 429 },
    )
  }

  await connectDB()
  const userId = session.user.id

  await MatchRequest.findOneAndUpdate(
    { userId, type: 'voice', status: 'waiting' },
    { $set: { status: 'cancelled' } }
  )

  const excludedIds = await getBlockedUserIds(userId)
  const existing = await MatchRequest.findOneAndUpdate(
    {
      type: 'voice',
      targetLanguage: nativeLanguage,
      nativeLanguage: targetLanguage,
      status: 'waiting',
      userId: { $nin: [userId, ...excludedIds] },
      lastPolledAt: activeFilter(),
    },
    { $set: { status: 'matched' } },
    { returnDocument: 'after' }
  )

  if (existing) {
    const partnerDoc = await User.findById(existing.userId)
      .select(MATCH_PARTNER_SELECT)
      .lean() as Record<string, unknown>
    const conv = await createVoiceConversation(userId, existing.userId.toString(), targetLanguage)
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
    type: 'voice',
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
    const partnerDoc = await User.findById(partnerId)
      .select(MATCH_PARTNER_SELECT)
      .lean() as Record<string, unknown>

    return NextResponse.json({
      matched: true,
      conversationId: (request.conversationId as object).toString(),
      partner: buildPartner(partnerDoc),
      compatibilityPct: compatibilityPct(session.user.id, partnerId?.toString() ?? ''),
    })
  }

  const waitingMs = Date.now() - new Date(request.createdAt as Date).getTime()
  if (waitingMs >= LANGUAGE_FALLBACK_MS) {
    const excludedIds = await getBlockedUserIds(session.user.id)
    const fallback = await MatchRequest.findOneAndUpdate(
      {
        type: 'voice',
        status: 'waiting',
        userId: { $nin: [session.user.id, ...excludedIds] },
        lastPolledAt: activeFilter(),
      },
      { $set: { status: 'matched' } },
      { returnDocument: 'after' }
    )

    if (fallback) {
      const partnerDoc = await User.findById(fallback.userId)
        .select(MATCH_PARTNER_SELECT)
        .lean() as Record<string, unknown>
      const language = (request.targetLanguage as string)
      const conv = await createVoiceConversation(session.user.id, fallback.userId.toString(), language)

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
