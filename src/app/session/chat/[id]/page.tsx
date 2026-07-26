import { redirect } from "next/navigation"

import { canonicalConversationPath } from "@/lib/messages/routes"

export default async function LegacySessionChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(canonicalConversationPath(id))
}
