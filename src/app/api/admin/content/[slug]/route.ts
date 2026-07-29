import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import PageContent from '@/lib/models/PageContent'
import { internalErrorResponse } from '@/lib/observability/report.server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { slug } = await params
    await connectDB()
    const content = await PageContent.findOne({ slug }).lean()
    if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(content)
  } catch (err) {
    return internalErrorResponse('admin/content/[slug] GET', err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { slug } = await params
    const body = await req.json()
    const allowed = ['title', 'body', 'page', 'isPublished']
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }
    update.updatedBy = (session.user as { email?: string }).email ?? ''

    await connectDB()
    const content = await PageContent.findOneAndUpdate(
      { slug },
      { $set: update },
      { new: true, runValidators: true }
    ).lean()

    if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(content)
  } catch (err) {
    return internalErrorResponse('admin/content/[slug] PATCH', err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { slug } = await params
    await connectDB()
    const content = await PageContent.findOneAndDelete({ slug })
    if (!content) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return internalErrorResponse('admin/content/[slug] DELETE', err)
  }
}
