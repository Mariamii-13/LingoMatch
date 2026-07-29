import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { internalErrorResponse } from '@/lib/observability/report.server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const planFilter = searchParams.get('plan') ?? ''
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = 50
    const skip = (page - 1) * limit

    await connectDB()

    const filter: Record<string, unknown> = {}
    if (planFilter === 'free' || planFilter === 'premium') filter.plan = planFilter

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('_id displayName email username avatar plan planExpiry stripeCustomerId createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ])

    return NextResponse.json({ users, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (err) {
    return internalErrorResponse('admin/billing GET', err)
  }
}
