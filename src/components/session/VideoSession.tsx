"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  VideoTrack,
  useTracks,
  useDataChannel,
} from "@livekit/components-react"
import { LocalParticipant, Track } from "livekit-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SessionControls } from "./SessionControls"
import { ChatPanel } from "./ChatPanel"
import type { Message, MatchResult } from "@/types"

interface VideoSessionProps {
  conversationId: string
  partner: MatchResult["partner"]
  token: string
  serverUrl: string
}

function VideoSessionInner({
  conversationId,
  partner,
  myId,
  onEnd,
}: {
  conversationId: string
  partner: MatchResult["partner"]
  myId: string
  onEnd: () => void
}) {
  const [chatOpen, setChatOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])
  const { localParticipant } = useLocalParticipant()
  const remoteTracks = useTracks([Track.Source.Camera], { onlySubscribed: true })
  const localTracks = useTracks([Track.Source.Camera], { onlySubscribed: false })

  const cameraEnabled = localParticipant.isCameraEnabled
  const micEnabled = localParticipant.isMicrophoneEnabled

  const { send } = useDataChannel("chat", (msg) => {
    try {
      const decoded = new TextDecoder().decode(msg.payload)
      const parsed = JSON.parse(decoded) as Message
      setMessages((prev) => [...prev, parsed])
    } catch {
      // ignore malformed
    }
  })

  const sendMessage = async (content: string) => {
    const msg: Message = {
      id: `${Date.now()}-local`,
      conversationId,
      senderId: myId,
      senderName: localParticipant.name ?? "You",
      senderInitials: "ME",
      senderAvatarColor: "from-violet-500 to-indigo-500",
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, msg])
    send(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true })
    await fetch(`/api/session/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
  }

  const addFriend = async () => {
    await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: partner.id }),
    })
  }

  const remoteVideoTrack = remoteTracks.find(t => !(t.participant instanceof LocalParticipant))
  const localVideoTrack = localTracks.find(t => t.participant instanceof LocalParticipant)

  return (
    <div className="dark fixed inset-0 flex flex-col bg-zinc-950 text-white">
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {remoteVideoTrack ? (
          <VideoTrack trackRef={remoteVideoTrack} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar className="size-24">
              <AvatarFallback className={`bg-gradient-to-br ${partner.avatarColor} text-3xl text-white`}>
                {partner.avatarInitials}
              </AvatarFallback>
            </Avatar>
            <p className="text-lg font-semibold">{partner.name} {partner.flag}</p>
            <p className="text-sm text-white/50">Camera off</p>
          </div>
        )}

        {localVideoTrack && (
          <div className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-xl border border-white/20">
            <VideoTrack trackRef={localVideoTrack} className="h-full w-full object-cover" />
          </div>
        )}

        <RoomAudioRenderer />

        {chatOpen && (
          <ChatPanel
            messages={messages}
            partnerId={partner.id}
            myId={myId}
            onSend={sendMessage}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      <SessionControls
        cameraEnabled={cameraEnabled}
        micEnabled={micEnabled}
        chatOpen={chatOpen}
        onToggleCamera={() => localParticipant.setCameraEnabled(!cameraEnabled)}
        onToggleMic={() => localParticipant.setMicrophoneEnabled(!micEnabled)}
        onToggleChat={() => setChatOpen((v) => !v)}
        onAddFriend={addFriend}
        onEnd={onEnd}
      />
    </div>
  )
}

export function VideoSession({ conversationId, partner, token, serverUrl }: VideoSessionProps) {
  const router = useRouter()
  const { data: authSession } = useSession()
  const myId = authSession?.user?.id ?? ""

  const handleEnd = async () => {
    await fetch(`/api/session/${conversationId}/end`, { method: "POST" })
    router.push("/dashboard")
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video
      onDisconnected={handleEnd}
    >
      <VideoSessionInner
        conversationId={conversationId}
        partner={partner}
        myId={myId}
        onEnd={handleEnd}
      />
    </LiveKitRoom>
  )
}
