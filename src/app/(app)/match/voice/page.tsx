import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getUserLanguageProfile } from "@/lib/language-profile.server"
import { resolveMatchDefaults } from "@/lib/match-defaults"
import { VoiceMatchClient } from "./VoiceMatchClient"

export const metadata: Metadata = { title: "Voice match" }

export default async function VoiceMatchPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const result = await getUserLanguageProfile(session.user.id)
  if (!result?.complete) redirect("/languages")

  return <VoiceMatchClient defaults={resolveMatchDefaults(result.profile)} />
}
