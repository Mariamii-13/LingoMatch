import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'

import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { migrateLegacyLevel } from '@/constants/languages'

const VALID_INTERESTS = ['anime', 'books', 'movies', 'music', 'gaming', 'travel', 'food', 'hobbies']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const country = searchParams.get('country') ?? ''
  const language = searchParams.get('language') ?? ''
  const interest = searchParams.get('interest')?.toLowerCase() ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(20, parseInt(searchParams.get('limit') ?? '8', 10))

  await connectDB()

  const myId = session.user.id

  const base: Record<string, unknown> = {
    _id: { $ne: new mongoose.Types.ObjectId(myId) },
    isBanned: false,
    isActive: true,
  }

  const andClauses: Record<string, unknown>[] = []

  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    andClauses.push({
      $or: [
        { username: { $regex: `^${escaped.toLowerCase()}` } },
        { displayName: { $regex: escaped, $options: 'i' } },
      ],
    })
  }

  if (country) base.country = country

  if (language) {
    const code = language.toLowerCase()
    andClauses.push({
      $or: [
        { 'spokenLanguages.code': code },
        { nativeLanguages: code },           // backward compat
        { 'learningLanguages.code': code },
      ],
    })
  }

  if (interest && VALID_INTERESTS.includes(interest)) {
    base[`interests.${interest}.0`] = { $exists: true }
  }

  if (andClauses.length > 0) base.$and = andClauses

  // Parallel: fetch result users + current user's relationship state
  const [users, total, me, sentToUsers] = await Promise.all([
    User.find(base)
      .select('username displayName avatar bio country nativeLanguages spokenLanguages learningLanguages interests')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(base),
    // my friends + who sent me requests
    User.findById(myId).select('friends friendRequests').lean(),
    // who I've sent requests to — uses the friendRequests.from index
    User.find({ 'friendRequests.from': new mongoose.Types.ObjectId(myId) })
      .select('_id')
      .lean(),
  ])

  const myFriendIds = new Set(
    ((me as { friends?: mongoose.Types.ObjectId[] } | null)?.friends ?? []).map((id) =>
      id.toString()
    )
  )

  const incomingFromIds = new Set(
    (
      (me as { friendRequests?: { from: mongoose.Types.ObjectId }[] } | null)
        ?.friendRequests ?? []
    ).map((r) => r.from.toString())
  )

  const sentToIds = new Set(
    (sentToUsers as { _id: mongoose.Types.ObjectId }[]).map((u) => u._id.toString())
  )

  const result = users.map((u) => {
    const uid = (u._id as mongoose.Types.ObjectId).toString()

    let friendStatus: 'friends' | 'pending_sent' | 'pending_received' | 'none'
    if (myFriendIds.has(uid)) friendStatus = 'friends'
    else if (sentToIds.has(uid)) friendStatus = 'pending_sent'
    else if (incomingFromIds.has(uid)) friendStatus = 'pending_received'
    else friendStatus = 'none'

    const interests = u.interests as Record<string, string[]> | undefined
    const interestCategories = VALID_INTERESTS.filter(
      (k) => Array.isArray(interests?.[k]) && (interests![k] as string[]).length > 0
    )

    return {
      id: uid,
      username: u.username as string,
      displayName: u.displayName as string,
      avatar: (u.avatar as string) || '',
      bio: (u.bio as string) || '',
      country: (u.country as string) || '',
      spokenLanguages: (() => {
        const spoken = (u.spokenLanguages as { code: string; level: string }[] | undefined) ?? []
        const base = spoken.length
          ? spoken
          : ((u.nativeLanguages as string[]) ?? []).map((code) => ({ code, level: 'native' }))
        return base.map((l) => ({ ...l, level: l.level === 'native' ? 'native' : 'other' }))
      })(),
      learningLanguages: ((u.learningLanguages as { code: string; level: string }[]) ?? []).map(
        (l) => ({ code: l.code, level: migrateLegacyLevel(l.level) })
      ),
      interestCategories,
      friendStatus,
    }
  })

  return NextResponse.json({ users: result, total, hasMore: page * limit < total })
}
