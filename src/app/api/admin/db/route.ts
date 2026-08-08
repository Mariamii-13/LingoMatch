import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import { internalErrorResponse } from '@/lib/observability/report.server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

const ALLOWED_COLLECTIONS = [
  'users',
  'conversations',
  'conversationfeedbacks',
  'matchrequests',
  'messages',
  'ratelimits',
  'reports',
  'uploads',
  'themesettings',
  'pagecontents',
  'pricingplans',
  'tutorsessions',
  'skillreviews',
]

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const conn = await connectDB()
    const results = await Promise.all(
      ALLOWED_COLLECTIONS.map(async (name) => {
        try {
          const count = await conn.collection(name).countDocuments()
          return { name, count }
        } catch {
          return { name, count: 0 }
        }
      })
    )
    return NextResponse.json(results)
  } catch (err) {
    return internalErrorResponse('admin/db GET', err)
  }
}
