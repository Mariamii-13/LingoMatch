import { Inbox } from "lucide-react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { connectDB } from "@/lib/db"
import Conversation from "@/lib/models/Conversation"
import MessageModel from "@/lib/models/Message"
import User from "@/lib/models/User"
import { ConversationList } from "@/components/messages/ConversationList"
import type { Conversation as ConversationType } from "@/types"

export default async function MessagesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  await connectDB()
  const userId = session.user.id

  const convs = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .lean()

  const shaped: ConversationType[] = await Promise.all(
    convs.map(async (conv) => {
      const participants = conv.participants as { toString(): string }[]
      const partnerId = participants.find((p) => p.toString() !== userId)
      const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown> | null
      const name = (partnerDoc?.displayName as string) ?? "Unknown"

      const lastMsg = await MessageModel.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 }).lean()

      return {
        id: (conv._id as object).toString(),
        type: conv.type as "chat" | "video",
        partner: {
          id: partnerDoc ? (partnerDoc._id as object).toString() : "",
          name,
          username: (partnerDoc?.username as string) ?? "",
          flag: "",
          avatarInitials: name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          avatarColor: "from-violet-500 to-indigo-500",
        },
        language: conv.language,
        status: conv.status as "active" | "ended",
        lastMessage: lastMsg
          ? { content: lastMsg.content, createdAt: (lastMsg.createdAt as Date).toISOString() }
          : undefined,
        unreadCount: 0,
        startedAt: conv.startedAt.toISOString(),
      }
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Inbox className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>
      <div className="rounded-xl border bg-card">
        <ConversationList conversations={shaped} />
      </div>
    </div>
  )
}
