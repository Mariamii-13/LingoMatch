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

  const { id: targetUserId } = await params

  await connectDB()

  await User.findByIdAndUpdate(targetUserId, {
    $pull: { friendRequests: { from: session.user.id } },
  })

  return NextResponse.json({ ok: true })
}
