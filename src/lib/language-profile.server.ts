import 'server-only'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import {
  buildLanguageProfileUpdate,
  isLanguageProfileComplete,
  resolveLanguageProfile,
  type LanguageProfile,
  type LanguageProfileSource,
} from '@/lib/language-profile'

type UserLanguageDocument = LanguageProfileSource & {
  _id: unknown
  languageProfile?: LanguageProfile | null
}

export async function getUserLanguageProfile(userId: string): Promise<{
  profile: LanguageProfile
  complete: boolean
} | null> {
  await connectDB()
  const user = await User.findById(userId)
    .select('languageProfile nativeLanguages spokenLanguages learningLanguages')
    .lean() as UserLanguageDocument | null
  if (!user) return null

  const profile = resolveLanguageProfile(user)
  const complete = isLanguageProfileComplete(profile)

  if (complete && !user.languageProfile) {
    const update = buildLanguageProfileUpdate(profile, user.spokenLanguages ?? [], profile.completedAt)
    await User.updateOne({ _id: userId, languageProfile: null }, { $set: update })
  }

  return { profile, complete }
}
