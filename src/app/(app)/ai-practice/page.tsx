import type { Metadata } from "next"
import { AIPracticeClient } from './AIPracticeClient'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getUserLanguageProfile } from '@/lib/language-profile.server'
import { getActiveTutorSession } from '@/lib/ai/tutor-session.server'

export const metadata: Metadata = { title: "AI Practice" }

export default async function AIPracticePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [result, activeSession] = await Promise.all([
    getUserLanguageProfile(session.user.id),
    // Resolved on the server so a reload lands straight back in the conversation
    // rather than flashing the setup screen first.
    getActiveTutorSession(session.user.id),
  ])
  if (!result?.complete) redirect('/languages')

  return (
    <div className="space-y-6">
      <AIPracticeClient
        profile={{
          nativeLanguages: result.profile.nativeLanguages,
          learningLanguages: result.profile.learningLanguages,
          preferredExplanationLanguage: result.profile.preferredExplanationLanguage,
        }}
        initialSession={activeSession}
      />
    </div>
  )
}
