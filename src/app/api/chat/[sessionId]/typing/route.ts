import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
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
