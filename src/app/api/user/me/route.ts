import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const user = await User.findById(session.user.id).select('-passwordHash')
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const allowed = [
    'displayName',
    'country',
    'timezone',
    'avatar',
    'nativeLanguages',
    'learningLanguages',
    'interests',
    'conversationModes',
    'onboardingCompleted',
  ]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  await connectDB()

  if ('username' in body) {
    const uname = (body.username as string)?.trim().toLowerCase()
    if (uname) {
      const taken = await User.findOne({ username: uname, _id: { $ne: session.user.id } }).lean()
      if (taken) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
      update.username = uname
    }
  }

  const user = await User.findByIdAndUpdate(session.user.id, update, {
    returnDocument: 'after',
  }).select('-passwordHash')

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json(user)
}
