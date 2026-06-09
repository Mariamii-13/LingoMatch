import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'

import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

const VALID_INTERESTS = ['anime', 'books', 'movies', 'music', 'gaming', 'travel', 'food', 'hobbies']

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim().toLowerCase() ?? ''
  const country = searchParams.get('country') ?? ''
  const language = searchParams.get('language') ?? ''
  const interest = searchParams.get('interest')?.toLowerCase() ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(20, parseInt(searchParams.get('limit') ?? '8', 10))

  await connectDB()

  const base: Record<string, unknown> = {
    _id: { $ne: new mongoose.Types.ObjectId(session.user.id) },
    isBanned: false,
    isActive: true,
  }

  const andClauses: Record<string, unknown>[] = []

  if (q) {
    // username and email are stored lowercase; prefix regex uses the existing B-tree indexes
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    andClauses.push({
      $or: [
        { username: { $regex: `^${escaped}` } },
        { email: { $regex: `^${escaped}` } },
      ],
    })
  }

  if (country) base.country = country

  if (language) {
    const code = language.toUpperCase()
    andClauses.push({
      $or: [
        { nativeLanguages: code },
        { 'learningLanguages.code': code },
      ],
    })
  }

  if (interest && VALID_INTERESTS.includes(interest)) {
    // index 0 existence check is the most efficient non-empty array test
    base[`interests.${interest}.0`] = { $exists: true }
  }

  if (andClauses.length > 0) base.$and = andClauses

  const [users, total, me] = await Promise.all([
    User.find(base)
      .select('username email displayName avatar country nativeLanguages learningLanguages friends friendRequests')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(base),
    User.findById(session.user.id).select('friends').lean(),
  ])

  const myFriendIds = new Set(
    ((me as { friends?: mongoose.Types.ObjectId[] } | null)?.friends ?? []).map((id) =>
      id.toString()
    )
  )

  const result = users.map((u) => {
    const uid = (u._id as mongoose.Types.ObjectId).toString()
    const isFriend = myFriendIds.has(uid)
    const sentRequest = (
      u.friendRequests as { from: mongoose.Types.ObjectId }[] | undefined
    )?.some((r) => r.from.toString() === session.user!.id)

    return {
      _id: uid,
      username: u.username as string,
      email: u.email as string,
      displayName: u.displayName as string,
      avatar: (u.avatar as string) || '',
      country: (u.country as string) || '',
      nativeLanguages: (u.nativeLanguages as string[]) || [],
      learningLanguages: (u.learningLanguages as { code: string; level: string }[]) || [],
      friendStatus: isFriend ? 'friends' : sentRequest ? 'pending' : 'none',
    }
  })

  return NextResponse.json({ users: result, total, hasMore: page * limit < total })
}
