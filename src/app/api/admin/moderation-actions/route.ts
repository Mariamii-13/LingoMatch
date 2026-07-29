import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import ModerationAction from '@/lib/models/ModerationAction'
import { internalErrorResponse } from '@/lib/observability/report.server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

const PAGE_LIMIT = 20
const MAX_LIMIT = 50

/** Read-only on purpose — see ModerationAction.ts for why this is append-only. */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(MAX_LIMIT, parseInt(searchParams.get('limit') ?? String(PAGE_LIMIT), 10))

    await connectDB()

    const [docs, total] = await Promise.all([
      ModerationAction.find({})
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ModerationAction.countDocuments({}),
    ])

    const actions = docs.map((d) => ({
      id: (d._id as { toString(): string }).toString(),
      actorUsername: d.actorUsername as string,
      action: d.action as string,
      targetUsername: d.targetUsername as string,
      reason: (d.reason as string | null) ?? null,
      createdAt: (d.createdAt as Date).toISOString(),
    }))

    return NextResponse.json({ actions, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (err) {
    return internalErrorResponse('admin/moderation-actions GET', err)
  }
}
