import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { connectDB } from "@/lib/db"
import Conversation from "@/lib/models/Conversation"
import User from "@/lib/models/User"
import { ChatSession } from "@/components/session/ChatSession"

export default async function ChatSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return notFound()

  await connectDB()
  const { id } = await params

  const conv = await Conversation.findById(id).lean() as Record<string, unknown> | null
  if (!conv) return notFound()

  const participants = conv.participants as { toString(): string }[]
  const partnerId = participants.find((p) => p.toString() !== session.user!.id)
  const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown> | null
  if (!partnerDoc) return notFound()

  const name = (partnerDoc.displayName as string) ?? "Partner"
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  const partner = {
    id: (partnerDoc._id as object).toString(),
    name,
    username: (partnerDoc.username as string) ?? "",
    country: (partnerDoc.country as string) ?? "",
    flag: "",
    avatarInitials: initials,
    avatarColor: "from-violet-500 to-indigo-500",
    native: (partnerDoc.nativeLanguages as unknown[]) ?? [],
    learning: (partnerDoc.learningLanguages as unknown[]) ?? [],
    interests: [] as string[],
  }

  return <ChatSession conversationId={id} partner={partner as Parameters<typeof ChatSession>[0]["partner"]} />
}
