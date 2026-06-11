import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params

  // Rate limit: 30 typing events per 60 seconds (≈1 every 2s, prevents automation spam)
  const { allowed } = await checkRateLimit('typing', session.user.id, 30, 60)
  if (!allowed) return NextResponse.json({ ok: true }) // silently drop, not a user error

  await connectDB()

  const conv = await Conversation.findOneAndUpdate(
    {
      _id: sessionId,
      participants: session.user.id,
      status: 'active',
    },
    { $set: { [`typing.${session.user.id}`]: new Date() } }
  )

  if (!conv) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
