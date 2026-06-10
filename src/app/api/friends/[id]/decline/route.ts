import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: fromUserId } = await params

  await connectDB()

  await User.findByIdAndUpdate(session.user.id, {
    $pull: { friendRequests: { from: fromUserId } },
  })

  return NextResponse.json({ ok: true })
}
