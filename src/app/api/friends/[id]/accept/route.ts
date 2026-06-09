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

  await User.findByIdAndUpdate(myId, {
    $pull: { friendRequests: { from: fromUserId } },
    $addToSet: { friends: fromUserId },
  })
  await User.findByIdAndUpdate(fromUserId, {
    $addToSet: { friends: myId },
  })

  return NextResponse.json({ ok: true })
}
