import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'

import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params

  await connectDB()

  const [target, me] = await Promise.all([
    User.findOne({ username: username.toLowerCase(), isBanned: false, isActive: true })
      .select('username displayName avatar bio country nativeLanguages learningLanguages interests friends friendRequests createdAt')
      .lean(),
    User.findById(session.user.id)
      .select('friends friendRequests')
      .lean(),
  ])

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const targetId = (target._id as mongoose.Types.ObjectId).toString()
  const myId = session.user.id

  type FriendRequestEntry = { from: mongoose.Types.ObjectId }

  let friendStatus: 'self' | 'friends' | 'pending_sent' | 'pending_received' | 'none' = 'none'

  if (targetId === myId) {
    friendStatus = 'self'
  } else {
    const myFriendIds = new Set(
      ((me as { friends?: mongoose.Types.ObjectId[] } | null)?.friends ?? []).map((id) =>
        id.toString()
      )
    )
    const myIncomingIds = new Set(
      ((me as { friendRequests?: FriendRequestEntry[] } | null)?.friendRequests ?? []).map(
        (r) => r.from.toString()
      )
    )
    const theirIncomingIds = new Set(
      ((target as { friendRequests?: FriendRequestEntry[] }).friendRequests ?? []).map(
        (r) => r.from.toString()
      )
    )

    if (myFriendIds.has(targetId)) friendStatus = 'friends'
    else if (theirIncomingIds.has(myId)) friendStatus = 'pending_sent'
    else if (myIncomingIds.has(targetId)) friendStatus = 'pending_received'
  }

  const interestTags = Object.values(
    (target as { interests?: Record<string, string[]> }).interests ?? {}
  ).flat()

  return NextResponse.json({
    id: targetId,
    username: target.username as string,
    displayName: target.displayName as string,
    avatar: (target.avatar as string) || '',
    bio: (target.bio as string) || '',
    country: (target.country as string) || '',
    nativeLanguages: (target.nativeLanguages as string[]) || [],
    learningLanguages:
      (target.learningLanguages as { code: string; level: string }[]) || [],
    interestTags,
    friendsCount: ((target.friends as unknown[]) || []).length,
    joinedAt: (target.createdAt as Date).toISOString(),
    friendStatus,
  })
}
