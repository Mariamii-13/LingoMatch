import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Upload from '@/lib/models/Upload'
import Conversation from '@/lib/models/Conversation'
import Message from '@/lib/models/Message'

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

  const [totalUsers, activeUsers, totalUploads, totalMatches, totalMessages] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true, isBanned: false }),
      Upload.countDocuments(),
      Conversation.countDocuments(),
      Message.countDocuments(),
    ])

  return NextResponse.json({
    totalUsers,
    activeUsers,
    totalUploads,
    totalMatches,
    totalMessages,
  })
}
