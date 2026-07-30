"use client"

import { Camera, CameraOff, MessageSquare, Mic, MicOff, PhoneOff, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface SessionControlsProps {
  cameraEnabled: boolean
  micEnabled: boolean
  chatOpen: boolean
  onToggleCamera: () => void
  onToggleMic: () => void
  onToggleChat: () => void
  onAddFriend: () => void
  onEnd: () => void
}

function CtrlBtn({
  onClick,
  active,
  pressed,
  children,
  label,
}: {
  onClick: () => void
  active?: boolean
  pressed?: boolean
  children: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed ?? active ?? false}
      title={label}
      className={cn(
        "flex size-12 items-center justify-center rounded-full transition-colors",
        active ? "bg-primary text-white" : "bg-white/10 text-white hover:bg-white/20"
      )}
    >
      {children}
    </button>
  )
}

export function SessionControls({
  cameraEnabled,
  micEnabled,
  chatOpen,
  onToggleCamera,
  onToggleMic,
  onToggleChat,
  onAddFriend,
  onEnd,
}: SessionControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-5">
      <CtrlBtn
        onClick={onToggleCamera}
        pressed={cameraEnabled}
        label={cameraEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {cameraEnabled ? <Camera className="size-5" /> : <CameraOff className="size-5" />}
      </CtrlBtn>
      <CtrlBtn onClick={onToggleMic} pressed={micEnabled} label={micEnabled ? "Mute" : "Unmute"}>
        {micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
      </CtrlBtn>
      <CtrlBtn onClick={onToggleChat} active={chatOpen} label="Chat">
        <MessageSquare className="size-5" />
      </CtrlBtn>
      <CtrlBtn onClick={onAddFriend} label="Add friend">
        <UserPlus className="size-5" />
      </CtrlBtn>
      <button
        type="button"
        onClick={onEnd}
        className="flex h-12 items-center gap-2 rounded-full bg-red-600 px-5 font-medium text-white hover:bg-red-700"
      >
        <PhoneOff className="size-5" /> End
      </button>
    </div>
  )
}
