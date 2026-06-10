import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: friendId } = await params
  const myId = session.user.id

  await connectDB()

  await Promise.all([
    User.findByIdAndUpdate(myId, { $pull: { friends: friendId } }),
    User.findByIdAndUpdate(friendId, { $pull: { friends: myId } }),
  ])

  return NextResponse.json({ ok: true })
}
