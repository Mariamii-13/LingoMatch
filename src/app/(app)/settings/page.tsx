import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getUserProfileData, toPlainProfile } from "@/lib/user-profile.server"
import { buildSettingsFormState, type SettingsUser } from "@/lib/settings-form-state"
import type { UserProfileData } from "@/lib/onboarding-progress"
import { SettingsClient } from "./SettingsClient"

export const metadata: Metadata = { title: "Settings" }

/*
 * Rendered on the server. The form used to mount empty and populate itself from
 * /api/user/me, so every field — name, username, email, languages, AI
 * preferences — appeared blank for as long as that round trip took.
 */
export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const profile = toPlainProfile(await getUserProfileData(session.user.id)) as SettingsUser | null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account, privacy and preferences.
        </p>
      </div>

      <SettingsClient
        initialState={buildSettingsFormState(profile)}
        initialProfile={(profile as UserProfileData | null) ?? null}
      />
    </div>
  )
}
