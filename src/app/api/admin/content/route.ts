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

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = searchParams.get('page') ?? ''

    await connectDB()
    const filter = page ? { page } : {}
    const contents = await PageContent.find(filter).sort({ page: 1, slug: 1 }).lean()
    return NextResponse.json(contents)
  } catch (err) {
    return internalErrorResponse('admin/content GET', err)
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { slug, title, body, page, isPublished } = await req.json()

    if (!slug || !title) {
      return NextResponse.json({ error: 'slug and title are required' }, { status: 400 })
    }

    await connectDB()

    const existing = await PageContent.findOne({ slug: slug.toLowerCase().trim() })
    if (existing) {
      return NextResponse.json({ error: 'A content block with this slug already exists' }, { status: 409 })
    }

    const content = await PageContent.create({
      slug: slug.toLowerCase().trim(),
      title: title.trim(),
      body: body ?? '',
      page: (page as string)?.trim() ?? 'global',
      isPublished: isPublished !== undefined ? isPublished : true,
      updatedBy: (session.user as { email?: string }).email ?? '',
    })

    return NextResponse.json(content, { status: 201 })
  } catch (err) {
    return internalErrorResponse('admin/content POST', err)
  }
}
