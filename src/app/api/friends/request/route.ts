import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: 'targetUserId required' }, { status: 400 })

  await connectDB()

  const target = await User.findById(targetUserId)
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const alreadyRequested = target.friendRequests.some(
    (r: { from: { toString(): string } }) => r.from.toString() === session.user!.id
  )
  if (alreadyRequested) return NextResponse.json({ ok: true, alreadyRequested: true })

  await User.findByIdAndUpdate(targetUserId, {
    $push: { friendRequests: { from: session.user.id } },
  })

  return NextResponse.json({ ok: true })
}
