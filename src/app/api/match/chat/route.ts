import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import MatchRequest from '@/lib/models/MatchRequest'
import MatchAvailability from '@/lib/models/MatchAvailability'
import Conversation from '@/lib/models/Conversation'
import User from '@/lib/models/User'
import { checkRateLimit } from '@/lib/rateLimit'
import { matchRequestSchema } from '@/lib/validations/match'
import { activeProvider, type MatchCandidate } from '@/lib/matching'
import { getBlockedUserIds } from '@/lib/blocking.server'
import { buildMatchPartner as buildPartner, MATCH_PARTNER_SELECT } from '@/lib/match-partner.server'

const AVAILABILITY_MAX_MINUTES = 1440

async function tryMatch(
  userId: string,
  targetLanguage: string,
  nativeLanguage: string,
  countryPreference: string,
  excludedIds: string[]
) {
  const notCandidate = { $nin: [userId, ...excludedIds] }

  // Pass 1: prefer country match if specified
  if (countryPreference) {
    const exact = await MatchRequest.findOneAndUpdate(
      {
        type: 'chat',
        targetLanguage: nativeLanguage,
        nativeLanguage: targetLanguage,
        status: 'waiting',
        userId: notCandidate,
        countryPreference,
      },
      { $set: { status: 'matched' } },
      { returnDocument: 'after' }
    )
    if (exact) return exact
  }

  // Pass 2: any user with matching language pair
  return MatchRequest.findOneAndUpdate(
    {
      type: 'chat',
      targetLanguage: nativeLanguage,
      nativeLanguage: targetLanguage,
      status: 'waiting',
      userId: notCandidate,
    },
    { $set: { status: 'matched' } },
    { returnDocument: 'after' }
  )
}

/**
 * Roadmap #32: the liquidity fallback. Nobody is live-waiting right now
 * (`tryMatch` came up empty), so check for a standing "I'm free around this
 * time" row instead. Consuming one here means whoever declared it benefits
 * from a live joiner even though they aren't online themselves — they find
 * out via the dashboard's pending-match card next time they open the app.
 */
async function tryAvailabilityMatch(
  userId: string,
  targetLanguage: string,
  nativeLanguage: string,
  countryPreference: string,
  excludedIds: string[]
) {
  const notCandidate = { $nin: [userId, ...excludedIds] }
  const notExpired = { $gt: new Date() }

  if (countryPreference) {
    const exact = await MatchAvailability.findOneAndUpdate(
      {
        type: 'chat',
        targetLanguage: nativeLanguage,
        nativeLanguage: targetLanguage,
        status: 'open',
        userId: notCandidate,
        countryPreference,
        expiresAt: notExpired,
      },
      { $set: { status: 'matched' } },
      { returnDocument: 'after' }
    )
    if (exact) return exact
  }

  return MatchAvailability.findOneAndUpdate(
    {
      type: 'chat',
      targetLanguage: nativeLanguage,
      nativeLanguage: targetLanguage,
      status: 'open',
      userId: notCandidate,
      expiresAt: notExpired,
    },
    { $set: { status: 'matched' } },
    { returnDocument: 'after' }
  )
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
  // Codes arrive normalised, so the reciprocal lookup below compares like with like.
  const { targetLanguage, nativeLanguage, interests, countryPreference, availabilityMinutes } = parsed.data

  // Rate limit: 5 queue joins per minute
  const { allowed } = await checkRateLimit('match-queue', session.user.id, 5, 60)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many match requests. Wait a moment before trying again.' },
      { status: 429 }
    )
  }

  await connectDB()
  const userId = session.user.id

  // Cancel any existing waiting/open request from this user to prevent queue spam
  await Promise.all([
    MatchRequest.findOneAndUpdate(
      { userId, type: 'chat', status: 'waiting' },
      { $set: { status: 'cancelled' } }
    ),
    MatchAvailability.findOneAndUpdate(
      { userId, type: 'chat', status: 'open' },
      { $set: { status: 'cancelled' } }
    ),
  ])

  const excludedIds = await getBlockedUserIds(userId)
  const existing =
    (await tryMatch(userId, targetLanguage, nativeLanguage, countryPreference, excludedIds)) ??
    (await tryAvailabilityMatch(userId, targetLanguage, nativeLanguage, countryPreference, excludedIds))

  if (existing) {
    const partnerDoc = await User.findById(existing.userId)
      .select(MATCH_PARTNER_SELECT)
      .lean() as Record<string, unknown>

    const candidate1: MatchCandidate = {
      userId,
      targetLanguage,
      nativeLanguage,
      countryPreference,
      interests,
    }
    const candidate2: MatchCandidate = {
      userId: (existing.userId as { toString(): string }).toString(),
      targetLanguage: existing.targetLanguage as string,
      nativeLanguage: existing.nativeLanguage as string,
      countryPreference: (existing.countryPreference as string) || '',
      interests: (existing.interests as string[]) || [],
    }
    const { score: compatibilityPct } = await activeProvider.score(candidate1, candidate2)

    const conv = await Conversation.create({
      participants: [userId, existing.userId],
      type: 'chat',
      language: targetLanguage,
      status: 'active',
      compatibilityPct: Math.round(compatibilityPct),
    })

    existing.conversationId = conv._id
    await existing.save()

    return NextResponse.json({
      matched: true,
      conversationId: conv._id.toString(),
      partner: buildPartner(partnerDoc),
      compatibilityPct: Math.round(compatibilityPct),
    })
  }

  if (availabilityMinutes > 0) {
    const minutes = Math.min(availabilityMinutes, AVAILABILITY_MAX_MINUTES)
    const availability = await MatchAvailability.create({
      userId,
      type: 'chat',
      targetLanguage,
      nativeLanguage,
      interests,
      countryPreference,
      status: 'open',
      expiresAt: new Date(Date.now() + minutes * 60_000),
    })

    // Distinct from `requestId`: this id belongs to MatchAvailability, not
    // MatchRequest, and the GET handler below only ever polls the latter.
    // Windowed requests don't poll at all — see ChatMatchClient.
    return NextResponse.json({
      matched: false,
      availability: true,
      availabilityId: availability._id.toString(),
      expiresAt: availability.expiresAt,
    })
  }

  const request = await MatchRequest.create({
    userId,
    type: 'chat',
    targetLanguage,
    nativeLanguage,
    interests,
    countryPreference,
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

  if (!request) return NextResponse.json({ matched: false, expired: true })
  if ((request.userId as { toString(): string }).toString() !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (request.status === 'cancelled') return NextResponse.json({ matched: false, cancelled: true })
  if (request.status !== 'matched') return NextResponse.json({ matched: false })

  const conv = await Conversation.findById(request.conversationId).lean() as Record<string, unknown> | null
  if (!conv) {
    // Matched status but conversation creation failed — treat as unmatched
    return NextResponse.json({ matched: false })
  }

  const participants = conv.participants as { toString(): string }[]
  const partnerId = participants.find((p) => p.toString() !== session.user!.id)

  const partnerDoc = await User.findById(partnerId)
    .select(MATCH_PARTNER_SELECT)
    .lean() as Record<string, unknown>

  return NextResponse.json({
    matched: true,
    conversationId: (request.conversationId as { toString(): string }).toString(),
    partner: buildPartner(partnerDoc),
    compatibilityPct: (conv.compatibilityPct as number) ?? 75,
  })
}
