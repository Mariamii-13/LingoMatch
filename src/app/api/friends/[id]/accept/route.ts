import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id: fromUserId } = await params
  const myId = session.user.id

  // C2: verify the request actually exists before accepting
  const me = await User.findById(myId).select('friendRequests').lean()
  const requestExists = (
    me as { friendRequests?: { from: { toString(): string } }[] } | null
  )?.friendRequests?.some((r) => r.from.toString() === fromUserId)

  if (!requestExists) {
    return NextResponse.json({ error: 'No pending friend request from this user' }, { status: 400 })
  }

  await Promise.all([
    User.findByIdAndUpdate(myId, {
      $pull: { friendRequests: { from: fromUserId } },
      $addToSet: { friends: fromUserId },
    }),
    User.findByIdAndUpdate(fromUserId, {
      $addToSet: { friends: myId },
    }),
  ])

  return NextResponse.json({ ok: true })
}
