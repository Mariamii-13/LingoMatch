import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

const DEFAULT_AI_PROFILE = {
  conversationGoals: [],
  matchingPriority: '',
  socialEnergy: 5,
  comfortLevel: 6,
  socialAnxietyLevel: 4,
  pace: 'Medium',
  style: 'Casual',
  preferredTraits: [],
  personalityNotes: '',
  topicsToAvoid: [],
  aiConversationStarters: true,
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const user = await User.findByIdAndUpdate(
    session.user.id,
    { $set: { aiProfile: DEFAULT_AI_PROFILE } },
    { returnDocument: 'after' }
  ).select('-passwordHash')

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json(user)
}
