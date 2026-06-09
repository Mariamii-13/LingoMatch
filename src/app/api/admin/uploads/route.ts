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

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const userId = formData.get('userId') as string | null
  const type = (formData.get('type') as string) || 'avatar'

  if (!file || !userId) {
    return NextResponse.json({ error: 'file and userId required' }, { status: 400 })
  }

  if (!['avatar', 'voice'].includes(type)) {
    return NextResponse.json({ error: 'type must be avatar or voice' }, { status: 400 })
  }

  const maxSize = type === 'avatar' ? 2 * 1024 * 1024 : 5 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: `File exceeds ${maxSize / (1024 * 1024)}MB limit` }, { status: 400 })
  }

  await connectDB()

  const targetUser = await User.findById(userId)
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const folder = type === 'avatar' ? 'lingomatch/avatars' : 'lingomatch/voice'
  const resourceType = type === 'voice' ? 'video' : 'image'

  const result = await new Promise<{ public_id: string; secure_url: string; bytes: number }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder, resource_type: resourceType }, (err, res) => {
          if (err || !res) return reject(err)
          resolve(res as { public_id: string; secure_url: string; bytes: number })
        })
        .end(buffer)
    }
  )

  if (type === 'avatar') {
    await User.findByIdAndUpdate(userId, { avatar: result.secure_url })
  } else {
    await User.findByIdAndUpdate(userId, { voiceIntro: result.secure_url })
  }

  const upload = await Upload.create({
    userId,
    publicId: result.public_id,
    url: result.secure_url,
    type,
    size: result.bytes,
  })

  const populated = await upload.populate('userId', 'displayName username email avatar')
  return NextResponse.json(populated, { status: 201 })
}
