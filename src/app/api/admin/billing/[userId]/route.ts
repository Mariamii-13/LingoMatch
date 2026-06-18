import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

const VALID_PLANS = ['free', 'premium'] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { userId } = await params
    await connectDB()
    const user = await User.findById(userId)
      .select('_id displayName email username avatar plan planExpiry stripeCustomerId dailySessionCount lastSessionDate createdAt')
      .lean()
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch (err) {
    console.error('[admin/billing/[userId] GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { userId } = await params
    const body = await req.json()
    const update: Record<string, unknown> = {}

    if ('plan' in body) {
      if (!VALID_PLANS.includes(body.plan)) {
        return NextResponse.json(
          { error: `plan must be one of: ${VALID_PLANS.join(', ')}` },
          { status: 400 }
        )
      }
      update.plan = body.plan
    }

    if ('planExpiry' in body) {
      update.planExpiry = body.planExpiry ? new Date(body.planExpiry) : null
    }

    if ('stripeCustomerId' in body) {
      update.stripeCustomerId = body.stripeCustomerId || null
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    await connectDB()
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    )
      .select('_id displayName email username avatar plan planExpiry stripeCustomerId dailySessionCount lastSessionDate createdAt')
      .lean()

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch (err) {
    console.error('[admin/billing/[userId] PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
