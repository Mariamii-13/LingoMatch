import { redirect } from "next/navigation"

import { canonicalConversationPath } from "@/lib/messages/routes"

export default async function LegacyChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = await params
  redirect(canonicalConversationPath(sessionId))
}
