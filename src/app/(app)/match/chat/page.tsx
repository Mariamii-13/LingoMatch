import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getUserLanguageProfile } from "@/lib/language-profile.server"
import { resolveMatchDefaults } from "@/lib/match-defaults"
import { ChatMatchClient } from "./ChatMatchClient"

export const metadata: Metadata = { title: "Text match" }

export default async function ChatMatchPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  // Seeding from the saved profile on the server means the form is already
  // correct on first paint, with no flash of the wrong languages.
  const result = await getUserLanguageProfile(session.user.id)
  if (!result?.complete) redirect("/languages")

  return <ChatMatchClient defaults={resolveMatchDefaults(result.profile)} />
}
