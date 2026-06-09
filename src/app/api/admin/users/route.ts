import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

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
  const users = await User.find({})
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .lean()

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { displayName, username, email, password, role, country } = await req.json()

  if (!displayName || !username || !email || !password) {
    return NextResponse.json({ error: 'displayName, username, email, password required' }, { status: 400 })
  }

  await connectDB()

  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] })
  if (existing) {
    return NextResponse.json({ error: 'Email or username already taken' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({
    displayName,
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    passwordHash,
    role: role === 'admin' ? 'admin' : 'user',
    country: country ?? '',
    isVerified: true,
  })

  const { passwordHash: _ph, ...safeUser } = user.toObject()
  return NextResponse.json(safeUser, { status: 201 })
}
