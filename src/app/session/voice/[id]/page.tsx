import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { connectDB } from "@/lib/db"
import Conversation from "@/lib/models/Conversation"
import User from "@/lib/models/User"
import { generateToken } from "@/lib/livekit"
import { VideoSession } from "@/components/session/VideoSession"

export default async function VoiceSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mic?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return notFound()

  await connectDB()
  const { id } = await params
  const { mic } = await searchParams
  const initialMic = mic !== "0"

  const conv = await Conversation.findById(id).lean() as Record<string, unknown> | null
  if (!conv || conv.type !== "voice") return notFound()

  const participants = conv.participants as { toString(): string }[]
  const partnerId = participants.find((p) => p.toString() !== session.user!.id)
  const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown> | null
  if (!partnerDoc) return notFound()

  const roomName = (conv.livekitRoomName as string) ?? `lm-voice-${id}`

  const token = await generateToken({
    identity: session.user.id,
    name: session.user.name ?? "User",
    roomName,
    ttl: 3600,
  })

  const name = (partnerDoc.displayName as string) ?? "Partner"
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  const partner = {
    id: (partnerDoc._id as object).toString(),
    name,
    username: (partnerDoc.username as string) ?? "",
    country: (partnerDoc.country as string) ?? "",
    flag: "",
    avatarInitials: initials,
    avatarColor: "from-amber-500 to-orange-500",
    native: (partnerDoc.nativeLanguages as unknown[]) ?? [],
    learning: (partnerDoc.learningLanguages as unknown[]) ?? [],
    interests: [] as string[],
  }

  return (
    <VideoSession
      conversationId={id}
      partner={partner as Parameters<typeof VideoSession>[0]["partner"]}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
      initialCamera={false}
      initialMic={initialMic}
      audioOnly
    />
  )
}
