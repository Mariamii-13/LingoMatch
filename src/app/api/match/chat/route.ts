import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import MatchRequest from '@/lib/models/MatchRequest'
import Conversation from '@/lib/models/Conversation'
import User from '@/lib/models/User'
import { avatarGradient } from '@/lib/utils'
import { languageOptions } from '@/lib/mock-data'
import { checkRateLimit } from '@/lib/rateLimit'
import { activeProvider, type MatchCandidate } from '@/lib/matching'

function langMeta(code: string) {
  return languageOptions.find((l) => l.code === code) ?? { code, name: code, flag: '' }
}

function buildPartner(doc: Record<string, unknown>) {
  const name = (doc.displayName as string) ?? 'Partner'
  const username = (doc.username as string) ?? ''
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const nativeCodes = (doc.nativeLanguages as string[]) ?? []
  const learningItems = (doc.learningLanguages as { code: string; level: string }[]) ?? []

  return {
    id: (doc._id as { toString(): string }).toString(),
    name,
    username,
    country: (doc.country as string) ?? '',
    flag: '',
    avatarInitials: initials,
    avatarColor: avatarGradient(username),
    native: nativeCodes.map((code) => {
      const l = langMeta(code)
      return { code: l.code, name: l.name, flag: l.flag, level: 'Native' }
    }),
    learning: learningItems.map(({ code, level }) => {
      const l = langMeta(code)
      return { code: l.code, name: l.name, flag: l.flag, level }
    }),
    interests: [],
  }
}

async function tryMatch(
  userId: string,
  targetLanguage: string,
  nativeLanguage: string,
  countryPreference: string
) {
  // Pass 1: prefer country match if specified
  if (countryPreference) {
    const exact = await MatchRequest.findOneAndUpdate(
      {
        type: 'chat',
        targetLanguage: nativeLanguage,
        nativeLanguage: targetLanguage,
        status: 'waiting',
        userId: { $ne: userId },
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
      userId: { $ne: userId },
    },
    { $set: { status: 'matched' } },
    { returnDocument: 'after' }
  )
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { targetLanguage, nativeLanguage, interests = [], countryPreference = '' } = body

  if (!targetLanguage || !nativeLanguage)
    return NextResponse.json(
      { error: 'targetLanguage and nativeLanguage required' },
      { status: 400 }
    )

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

  // Cancel any existing waiting request from this user to prevent queue spam
  await MatchRequest.findOneAndUpdate(
    { userId, type: 'chat', status: 'waiting' },
    { $set: { status: 'cancelled' } }
  )

  const existing = await tryMatch(userId, targetLanguage, nativeLanguage, countryPreference)

  if (existing) {
    const partnerDoc = await User.findById(existing.userId)
      .select('displayName username avatar country nativeLanguages learningLanguages')
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
    .select('displayName username avatar country nativeLanguages learningLanguages')
    .lean() as Record<string, unknown>

  return NextResponse.json({
    matched: true,
    conversationId: (request.conversationId as { toString(): string }).toString(),
    partner: buildPartner(partnerDoc),
    compatibilityPct: (conv.compatibilityPct as number) ?? 75,
  })
}
