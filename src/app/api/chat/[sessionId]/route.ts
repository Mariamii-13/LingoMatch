import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'
import User from '@/lib/models/User'
import { avatarGradient } from '@/lib/utils'
import { getLanguage } from '@/constants/languages'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  await connectDB()

  const conv = await Conversation.findById(sessionId).lean() as Record<string, unknown> | null
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const participants = conv.participants as { toString(): string }[]
  if (!participants.some((p) => p.toString() === session.user!.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const partnerId = participants.find((p) => p.toString() !== session.user!.id)
  const partnerDoc = await User.findById(partnerId)
    .select('displayName username avatar country nativeLanguages learningLanguages lastSeenAt')
    .lean() as Record<string, unknown>

  const name = (partnerDoc.displayName as string) ?? 'Partner'
  const username = (partnerDoc.username as string) ?? ''
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const nativeCodes = (partnerDoc.nativeLanguages as string[]) ?? []

  return NextResponse.json({
    sessionId,
    status: conv.status,
    language: conv.language,
    startedAt: conv.startedAt,
    partner: {
      id: (partnerDoc._id as mongoose.Types.ObjectId).toString(),
      name,
      username,
      country: (partnerDoc.country as string) || '',
      avatarInitials: initials,
      avatarColor: avatarGradient(username),
      lastSeenAt: partnerDoc.lastSeenAt
        ? (partnerDoc.lastSeenAt as Date).toISOString()
        : null,
      nativeLanguages: nativeCodes.map((code) => {
        const l = getLanguage(code)
        return { code: l.code, name: l.name, flag: l.flag }
      }),
    },
  })
}
