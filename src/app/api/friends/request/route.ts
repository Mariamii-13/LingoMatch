import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })

  // C1: prevent self-friend requests
  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 })
  }

  await connectDB()

  const [target, me] = await Promise.all([
    User.findById(targetUserId).select('friendRequests').lean(),
    User.findById(session.user.id).select('friends friendRequests').lean(),
  ])

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  type FriendRequestEntry = { from: mongoose.Types.ObjectId }

  // C4: prevent request if already friends
  const alreadyFriends = (
    (me as { friends?: mongoose.Types.ObjectId[] } | null)?.friends ?? []
  ).some((id) => id.toString() === targetUserId)
  if (alreadyFriends) return NextResponse.json({ ok: true, alreadyFriends: true })

  // Mutual request check: if target already sent me a request, auto-accept
  const hasIncomingFromTarget = (
    (me as { friendRequests?: FriendRequestEntry[] } | null)?.friendRequests ?? []
  ).some((r) => r.from.toString() === targetUserId)

  if (hasIncomingFromTarget) {
    await Promise.all([
      User.findByIdAndUpdate(session.user.id, {
        $pull: { friendRequests: { from: targetUserId } },
        $addToSet: { friends: targetUserId },
      }),
      User.findByIdAndUpdate(targetUserId, {
        $addToSet: { friends: session.user.id },
      }),
    ])
    return NextResponse.json({ ok: true, accepted: true })
  }

  // C3: atomic conditional push — only inserts if 'from' not already present
  const result = await User.findOneAndUpdate(
    {
      _id: targetUserId,
      'friendRequests.from': { $ne: new mongoose.Types.ObjectId(session.user.id) },
    },
    { $push: { friendRequests: { from: session.user.id } } }
  )

  if (!result) return NextResponse.json({ ok: true, alreadyRequested: true })

  return NextResponse.json({ ok: true })
}
