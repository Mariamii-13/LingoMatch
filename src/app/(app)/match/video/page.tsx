import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getUserLanguageProfile } from "@/lib/language-profile.server"
import { resolveMatchDefaults } from "@/lib/match-defaults"
import { VideoMatchClient } from "./VideoMatchClient"

export const metadata: Metadata = { title: "Live match" }

export default async function VideoMatchPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const result = await getUserLanguageProfile(session.user.id)
  if (!result?.complete) redirect("/languages")

  return <VideoMatchClient defaults={resolveMatchDefaults(result.profile)} />
}
