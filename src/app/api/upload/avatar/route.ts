import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Upload from '@/lib/models/Upload'
import cloudinary from '@/lib/cloudinary'

const MAX_BYTES = 2 * 1024 * 1024 // 2MB

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files allowed.' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large. Max 2MB.' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const result = await new Promise<{ secure_url: string; public_id: string; bytes: number }>(
    (resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'lingomatch/avatars', resource_type: 'image' },
          (err, res) => {
            if (err || !res) return reject(err)
            resolve(res as { secure_url: string; public_id: string; bytes: number })
          }
        )
        .end(buffer)
    }
  )

  await connectDB()

  await User.findByIdAndUpdate(session.user.id, { avatar: result.secure_url })

  await Upload.create({
    userId: session.user.id,
    publicId: result.public_id,
    url: result.secure_url,
    type: 'avatar',
    size: result.bytes,
  })

  return NextResponse.json({ url: result.secure_url })
}
