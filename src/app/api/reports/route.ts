import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Conversation from '@/lib/models/Conversation'
import Report, { REPORT_REASONS } from '@/lib/models/Report'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { reportedUserId, conversationId, reason, details = '' } = body

  if (!reportedUserId || !reason) {
    return NextResponse.json(
      { error: 'reportedUserId and reason required' },
      { status: 400 }
    )
  }
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }
  if (reportedUserId === session.user.id) {
    return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 })
  }

  // Rate limit: 10 reports per hour per user
  const { allowed } = await checkRateLimit('report', session.user.id, 10, 3600)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many reports submitted. Please wait before submitting another.' },
      { status: 429 }
    )
  }

  await connectDB()

  const reportedUser = await User.findById(reportedUserId).select('_id').lean()
  if (!reportedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // If conversationId provided, reporter must be a participant
  if (conversationId) {
    const conv = await Conversation.findById(conversationId).lean() as Record<string, unknown> | null
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    const participants = conv.participants as { toString(): string }[]
    if (!participants.some((p) => p.toString() === session.user!.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const report = await Report.create({
    reportedBy: session.user.id,
    reportedUser: reportedUserId,
    conversationId: conversationId ?? null,
    reason,
    details: String(details).slice(0, 1000),
  })

  return NextResponse.json({ ok: true, reportId: report._id.toString() }, { status: 201 })
}

// Admin: list open reports
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const reports = await Report.find({ status: 'open' })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('reportedBy', 'username displayName')
    .populate('reportedUser', 'username displayName')
    .lean()

  return NextResponse.json({ reports })
}
