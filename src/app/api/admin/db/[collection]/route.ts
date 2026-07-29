import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { internalErrorResponse } from '@/lib/observability/report.server'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

const ALLOWED_COLLECTIONS = new Set([
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
])

const PAGE_LIMIT = 20
const MAX_LIMIT = 50

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { collection } = await params
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return NextResponse.json({ error: 'Collection not allowed' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const limit = Math.min(MAX_LIMIT, parseInt(searchParams.get('limit') ?? String(PAGE_LIMIT), 10))
    const skip = (page - 1) * limit

    const conn = await connectDB()
    const col = conn.collection(collection)

    const [docs, total] = await Promise.all([
      col.find({}).skip(skip).limit(limit).toArray(),
      col.countDocuments({}),
    ])

    return NextResponse.json({ docs, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (err) {
    return internalErrorResponse('admin/db/[collection] GET', err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { collection } = await params
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return NextResponse.json({ error: 'Collection not allowed' }, { status: 400 })
    }

    const body = await req.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
    }

    delete body._id

    const conn = await connectDB()
    const result = await conn.collection(collection).insertOne(body)
    const inserted = await conn.collection(collection).findOne({ _id: result.insertedId })
    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    return internalErrorResponse('admin/db/[collection] POST', err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { collection } = await params
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return NextResponse.json({ error: 'Collection not allowed' }, { status: 400 })
    }

    const body = await req.json()
    const { _id, ...fields } = body

    if (!_id) {
      return NextResponse.json({ error: '_id is required' }, { status: 400 })
    }

    let objectId: ObjectId
    try {
      objectId = new ObjectId(String(_id))
    } catch {
      return NextResponse.json({ error: 'Invalid _id format' }, { status: 400 })
    }

    const conn = await connectDB()
    const result = await conn.collection(collection).findOneAndUpdate(
      { _id: objectId },
      { $set: fields },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (err) {
    return internalErrorResponse('admin/db/[collection] PATCH', err)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { collection } = await params
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      return NextResponse.json({ error: 'Collection not allowed' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query param required' }, { status: 400 })
    }

    let objectId: ObjectId
    try {
      objectId = new ObjectId(id)
    } catch {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 })
    }

    const conn = await connectDB()
    const result = await conn.collection(collection).deleteOne({ _id: objectId })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return internalErrorResponse('admin/db/[collection] DELETE', err)
  }
}
