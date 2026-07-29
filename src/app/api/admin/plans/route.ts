import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import PricingPlan from '@/lib/models/PricingPlan'
import { internalErrorResponse } from '@/lib/observability/report.server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await connectDB()
    const plans = await PricingPlan.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean()
    return NextResponse.json(plans)
  } catch (err) {
    return internalErrorResponse('admin/plans GET', err)
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const {
      name, planKey, description, price, currency,
      interval, features, isActive, stripePriceId,
      maxDailySessions, sortOrder,
    } = await req.json()

    if (!name || !planKey) {
      return NextResponse.json({ error: 'name and planKey are required' }, { status: 400 })
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 })
    }

    await connectDB()

    const existing = await PricingPlan.findOne({ planKey: planKey.toLowerCase().trim() })
    if (existing) {
      return NextResponse.json({ error: 'A plan with this planKey already exists' }, { status: 409 })
    }

    const plan = await PricingPlan.create({
      name: name.trim(),
      planKey: planKey.toLowerCase().trim(),
      description: description ?? '',
      price,
      currency: currency ?? 'USD',
      interval: interval ?? 'month',
      features: Array.isArray(features) ? features : [],
      isActive: isActive !== undefined ? isActive : true,
      stripePriceId: stripePriceId || null,
      maxDailySessions: maxDailySessions ?? 3,
      sortOrder: sortOrder ?? 0,
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (err) {
    return internalErrorResponse('admin/plans POST', err)
  }
}
