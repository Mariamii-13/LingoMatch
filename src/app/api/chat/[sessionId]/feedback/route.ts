import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'
import ConversationFeedback from '@/lib/models/ConversationFeedback'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await params
  const body = await req.json().catch(() => ({}))
  const { rating, wouldTalkAgain, note = '' } = body

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be integer 1–5' }, { status: 400 })
  }
  if (typeof wouldTalkAgain !== 'boolean') {
    return NextResponse.json({ error: 'wouldTalkAgain must be boolean' }, { status: 400 })
  }

  await connectDB()

  const conv = await Conversation.findById(sessionId).lean() as Record<string, unknown> | null
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (conv.status !== 'ended') {
    return NextResponse.json({ error: 'Conversation still active' }, { status: 400 })
  }

  const participants = conv.participants as { toString(): string }[]
  if (!participants.some((p) => p.toString() === session.user!.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await ConversationFeedback.create({
      conversationId: sessionId,
      submittedBy: session.user.id,
      rating: Math.round(rating),
      wouldTalkAgain,
      note: String(note).slice(0, 500),
    })
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: 'Feedback already submitted' }, { status: 409 })
    }
    throw err
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
