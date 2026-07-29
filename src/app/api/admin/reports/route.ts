import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Report from '@/lib/models/Report'

const MAX_LIMIT = 100

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

type PopulatedUser = { _id: { toString(): string }; username?: string } | null

type ReportDoc = {
  _id: { toString(): string }
  reportedBy: PopulatedUser
  reportedUser: PopulatedUser
  conversationId: { toString(): string } | null
  reason: string
  details: string
  status: string
  createdAt: Date
}

/**
 * Real moderation queue.
 *
 * Both the admin dashboard and the reports page previously rendered a
 * hard-coded list of invented reports, which is worse than showing nothing: an
 * admin could believe they had reviewed the queue when they had not seen a
 * single real report.
 */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await connectDB()

  const requested = Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '', 10)
  const limit = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 1), MAX_LIMIT)
    : MAX_LIMIT

  const docs = (await Report.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('reportedBy', 'username')
    .populate('reportedUser', 'username')
    .lean()) as unknown as ReportDoc[]

  return NextResponse.json({
    reports: docs.map((doc) => ({
      id: doc._id.toString(),
      reporter: doc.reportedBy?.username ?? 'deleted user',
      reportedUsername: doc.reportedUser?.username ?? 'deleted user',
      // Needed so a moderator can act on the account from the report itself.
      reportedUserId: doc.reportedUser?._id?.toString() ?? null,
      conversationId: doc.conversationId?.toString() ?? null,
      reason: doc.reason,
      details: doc.details ?? '',
      status: doc.status,
      createdAt: doc.createdAt,
    })),
  })
}
