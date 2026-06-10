import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

const PUBLIC_FIELDS = 'username displayName avatar bio country nativeLanguages learningLanguages'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()

  const [me, sentTo] = await Promise.all([
    User.findById(session.user.id)
      .select('friends friendRequests')
      .populate('friends', PUBLIC_FIELDS)
      .populate('friendRequests.from', PUBLIC_FIELDS)
      .lean(),
    User.find({ 'friendRequests.from': session.user.id })
      .select(PUBLIC_FIELDS)
      .lean(),
  ])

  if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  type PopulatedUser = {
    _id: { toString(): string }
    username: string
    displayName: string
    avatar: string
    bio?: string
    country: string
    nativeLanguages: string[]
    learningLanguages: { code: string; level: string }[]
  }

  function toCard(u: PopulatedUser) {
    return {
      id: u._id.toString(),
      username: u.username,
      displayName: u.displayName,
      avatar: u.avatar || '',
      country: u.country || '',
      nativeLanguages: u.nativeLanguages || [],
      learningLanguages: u.learningLanguages || [],
    }
  }

  const friends = ((me as unknown as { friends: PopulatedUser[] }).friends ?? []).map(toCard)

  const incoming = (
    (me as unknown as { friendRequests: { from: PopulatedUser }[] }).friendRequests ?? []
  ).map((r) => toCard(r.from))

  const sent = (sentTo as PopulatedUser[]).map(toCard)

  return NextResponse.json({ friends, incoming, sent })
}
