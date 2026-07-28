import { AIPracticeClient } from './AIPracticeClient'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getUserLanguageProfile } from '@/lib/language-profile.server'

export default async function AIPracticePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const result = await getUserLanguageProfile(session.user.id)
  if (!result?.complete) redirect('/languages')

  return (
    <div className="space-y-6">
      <AIPracticeClient
        profile={{
          nativeLanguages: result.profile.nativeLanguages,
          learningLanguages: result.profile.learningLanguages,
          preferredExplanationLanguage: result.profile.preferredExplanationLanguage,
        }}
      />
    </div>
  )
}
