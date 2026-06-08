import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Upload from '@/lib/models/Upload'
import User from '@/lib/models/User'
import cloudinary from '@/lib/cloudinary'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await connectDB()

  const upload = await Upload.findById(id)
  if (!upload) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await cloudinary.uploader.destroy(upload.publicId)

  if (upload.type === 'avatar') {
    await User.findByIdAndUpdate(upload.userId, { avatar: '' })
  } else if (upload.type === 'voice') {
    await User.findByIdAndUpdate(upload.userId, { voiceIntro: '' })
  }

  await Upload.findByIdAndDelete(id)

  return NextResponse.json({ success: true })
}
