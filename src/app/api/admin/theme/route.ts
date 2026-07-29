import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import ThemeSettings from '@/lib/models/ThemeSettings'
import { THEME_CACHE_TAG } from '@/lib/theme.server'
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
    const settings = await ThemeSettings.findOne({ siteId: 'default' }).lean()
    if (!settings) {
      return NextResponse.json({
        siteId: 'default',
        primaryColor: '#f59e0b',
        primaryForeground: '#09090b',
        defaultMode: 'system',
        fontFamily: 'inter',
        borderRadius: 'md',
        customCss: '',
      })
    }
    return NextResponse.json(settings)
  } catch (err) {
    return internalErrorResponse('admin/theme GET', err)
  }
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const allowed = ['primaryColor', 'primaryForeground', 'defaultMode', 'fontFamily', 'borderRadius', 'customCss']
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    await connectDB()
    const settings = await ThemeSettings.findOneAndUpdate(
      { siteId: 'default' },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    ).lean()

    // Every signed-in page renders the palette from a cached read. `expire: 0`
    // rather than the recommended `'max'` profile because an administrator who
    // just saved a colour should see it on the next render, not one render
    // later behind stale-while-revalidate.
    revalidateTag(THEME_CACHE_TAG, { expire: 0 })

    return NextResponse.json(settings)
  } catch (err) {
    return internalErrorResponse('admin/theme PUT', err)
  }
}
