import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Upload from '@/lib/models/Upload'

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

  await connectDB()
  const uploads = await Upload.find({})
    .populate('userId', 'displayName username email avatar')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json(uploads)
}
