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
  useParticipants,
  useConnectionState,
} from "@livekit/components-react"
import { LocalParticipant, Track, ConnectionState } from "livekit-client"
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  X,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MessageSquare,
  UserPlus,
  PhoneOff,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChatPanel } from "./ChatPanel"
import type { Message, MatchResult } from "@/types"

interface VideoSessionProps {
  conversationId: string
  partner: MatchResult["partner"]
  token: string
  serverUrl: string
  initialCamera?: boolean
  initialMic?: boolean
}

// ── Connection overlay ────────────────────────────────────────────────────────

function ConnectionOverlay({ state }: { state: ConnectionState }) {
  if (state === ConnectionState.Connected) return null

  const isError = state === ConnectionState.Disconnected

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95">
      {isError ? (
        <>
          <AlertCircle className="mb-3 size-12 text-red-400" />
          <p className="text-lg font-semibold text-white">Connection lost</p>
          <p className="mt-1 text-sm text-white/50">Reload the page to reconnect</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <RefreshCw className="size-4" />
            Retry
          </button>
        </>
      ) : (
        <>
          <Loader2 className="mb-3 size-12 animate-spin text-violet-400" />
          <p className="text-lg font-semibold text-white">
            {state === ConnectionState.Reconnecting ? "Reconnecting…" : "Connecting…"}
          </p>
        </>
      )}
    </div>
  )
}

// ── Participant list panel ────────────────────────────────────────────────────

function ParticipantPanel({
  onClose,
}: {
  onClose: () => void
}) {
  const participants = useParticipants()
  return (
    <div className="absolute right-0 top-0 z-30 flex h-full w-64 flex-col bg-zinc-900/95 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-semibold text-white">Participants ({participants.length})</span>
        <button onClick={onClose} className="rounded p-1 hover:bg-white/10">
          <X className="size-4 text-white/70" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((p) => (
          <div key={p.identity} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
              {(p.name ?? p.identity).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{p.name ?? p.identity}</p>
              <p className="text-xs text-white/40">
                {p instanceof LocalParticipant ? "You" : "Partner"}
              </p>
            </div>
            <div className="flex gap-1">
              {p.isMicrophoneEnabled ? (
                <Mic className="size-3.5 text-green-400" />
              ) : (
                <MicOff className="size-3.5 text-white/30" />
              )}
              {p.isCameraEnabled ? (
                <Camera className="size-3.5 text-green-400" />
              ) : (
                <CameraOff className="size-3.5 text-white/30" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Controls bar ──────────────────────────────────────────────────────────────

function ControlsBar({
  cameraEnabled,
  micEnabled,
  chatOpen,
  participantsOpen,
  onToggleCamera,
  onToggleMic,
  onToggleChat,
  onToggleParticipants,
  onAddFriend,
  onEnd,
}: {
  cameraEnabled: boolean
  micEnabled: boolean
  chatOpen: boolean
  participantsOpen: boolean
  onToggleCamera: () => void
  onToggleMic: () => void
  onToggleChat: () => void
  onToggleParticipants: () => void
  onAddFriend: () => void
  onEnd: () => void
}) {
  return (
    <div className="flex items-center justify-center gap-3 bg-zinc-900/80 px-4 py-3 backdrop-blur">
      <button
        onClick={onToggleCamera}
        title={cameraEnabled ? "Turn off camera" : "Turn on camera"}
        className={`flex size-11 items-center justify-center rounded-full transition ${
          cameraEnabled ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {cameraEnabled ? (
          <Camera className="size-5 text-white" />
        ) : (
          <CameraOff className="size-5 text-white" />
        )}
      </button>

      <button
        onClick={onToggleMic}
        title={micEnabled ? "Mute" : "Unmute"}
        className={`flex size-11 items-center justify-center rounded-full transition ${
          micEnabled ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {micEnabled ? (
          <Mic className="size-5 text-white" />
        ) : (
          <MicOff className="size-5 text-white" />
        )}
      </button>

      <button
        onClick={onToggleChat}
        title="Toggle chat"
        className={`flex size-11 items-center justify-center rounded-full transition ${
          chatOpen ? "bg-violet-600 hover:bg-violet-700" : "bg-white/10 hover:bg-white/20"
        }`}
      >
        <MessageSquare className="size-5 text-white" />
      </button>

      <button
        onClick={onToggleParticipants}
        title="Toggle participant list"
        className={`flex size-11 items-center justify-center rounded-full transition ${
          participantsOpen ? "bg-violet-600 hover:bg-violet-700" : "bg-white/10 hover:bg-white/20"
        }`}
      >
        <Users className="size-5 text-white" />
      </button>

      <button
        onClick={onAddFriend}
        title="Add friend"
        className="flex size-11 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
      >
        <UserPlus className="size-5 text-white" />
      </button>

      <button
        onClick={onEnd}
        title="Leave room"
        className="flex size-11 items-center justify-center rounded-full bg-red-600 transition hover:bg-red-700"
      >
        <PhoneOff className="size-5 text-white" />
      </button>
    </div>
  )
}

// ── Inner component (must be inside LiveKitRoom) ──────────────────────────────

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
  const [participantsOpen, setParticipantsOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])

  const connectionState = useConnectionState()
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

  /*
   * A remote participant turning their camera off mutes the existing
   * publication rather than unpublishing it — `useTracks` keeps returning the
   * subscribed-but-muted TrackReference, so without this check the last frame
   * (or a black frame) stays on screen forever instead of falling back to the
   * partner avatar.
   */
  const remoteVideoTracks = remoteTracks.filter(
    (t) => !(t.participant instanceof LocalParticipant) && !t.publication?.isMuted,
  )
  const localVideoTrack = localTracks.find((t) => t.participant instanceof LocalParticipant)

  return (
    <div className="dark fixed inset-0 flex flex-col bg-zinc-950 text-white">
      <ConnectionOverlay state={connectionState} />

      {/* Video area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">

        {/* Remote video(s) */}
        {remoteVideoTracks.length > 0 ? (
          remoteVideoTracks.length === 1 ? (
            <VideoTrack trackRef={remoteVideoTracks[0]} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full grid-cols-2 gap-1">
              {remoteVideoTracks.map((t) => (
                <VideoTrack key={t.participant.identity} trackRef={t} className="h-full w-full object-cover" />
              ))}
            </div>
          )
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

        {/* Local PiP */}
        {localVideoTrack && (
          <div className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-xl border border-white/20 shadow-xl">
            <VideoTrack trackRef={localVideoTrack} className="h-full w-full object-cover" />
          </div>
        )}

        <RoomAudioRenderer />

        {/* Side panels */}
        {chatOpen && (
          <ChatPanel
            messages={messages}
            partnerId={partner.id}
            myId={myId}
            onSend={sendMessage}
            onClose={() => setChatOpen(false)}
          />
        )}

        {participantsOpen && (
          <ParticipantPanel onClose={() => setParticipantsOpen(false)} />
        )}
      </div>

      {/* Controls */}
      <ControlsBar
        cameraEnabled={cameraEnabled}
        micEnabled={micEnabled}
        chatOpen={chatOpen}
        participantsOpen={participantsOpen}
        onToggleCamera={() => localParticipant.setCameraEnabled(!cameraEnabled)}
        onToggleMic={() => localParticipant.setMicrophoneEnabled(!micEnabled)}
        onToggleChat={() => setChatOpen((v) => !v)}
        onToggleParticipants={() => setParticipantsOpen((v) => !v)}
        onAddFriend={addFriend}
        onEnd={onEnd}
      />
    </div>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────

export function VideoSession({
  conversationId,
  partner,
  token,
  serverUrl,
  initialCamera = true,
  initialMic = true,
}: VideoSessionProps) {
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
      audio={initialMic}
      video={initialCamera}
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
