import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFriendLists } from '@/lib/friends.server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lists = await getFriendLists(session.user.id)
  if (!lists) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json(lists)
}
