"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Languages,
  Lightbulb,
  Mic,
  MicOff,
  PhoneOff,
  Smile,
  Video,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { aiPrompts, mockUsers } from "@/lib/mock-data"

const partner = mockUsers[0]
const reactions = ["👏", "😂", "❤️", "🔥", "🎉", "👍"]

interface FloatingReaction {
  id: number
  emoji: string
  left: number
}

function formatTime(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export default function SessionPage() {
  const router = useRouter()
  const [seconds, setSeconds] = React.useState(0)
  const [muted, setMuted] = React.useState(false)
  const [panelOpen, setPanelOpen] = React.useState(false)
  const [translation, setTranslation] = React.useState(false)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [floating, setFloating] = React.useState<FloatingReaction[]>([])
  const idRef = React.useRef(0)

  React.useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const sendReaction = (emoji: string) => {
    const id = ++idRef.current
    const left = 20 + ((id * 37) % 60)
    setFloating((prev) => [...prev, { id, emoji, left }])
    setPickerOpen(false)
    setTimeout(() => {
      setFloating((prev) => prev.filter((f) => f.id !== id))
    }, 2500)
  }

  return (
    <div className="dark fixed inset-0 flex flex-col bg-zinc-950 text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium tabular-nums">
          <span className="size-2 animate-pulse rounded-full bg-red-500" />
          {formatTime(seconds)}
        </div>
        <span className="text-sm text-white/60">Friendly · Spanish</span>
      </div>

      {/* Main stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* Floating reactions */}
        {floating.map((f) => (
          <span
            key={f.id}
            className="pointer-events-none absolute bottom-32 z-20 text-4xl"
            style={{ left: `${f.left}%`, animation: "floatUp 2.5s ease-out forwards" }}
          >
            {f.emoji}
          </span>
        ))}

        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <span className="absolute inset-0 -m-4 animate-pulse rounded-full bg-primary/20 blur-xl" />
            <div className="relative flex size-32 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 text-4xl font-semibold sm:size-40">
              {partner.avatarInitials}
            </div>
          </div>
          <h2 className="mt-6 text-2xl font-semibold">
            {partner.name} {partner.flag}
          </h2>
          <p className="mt-1 text-white/60">
            {partner.country} · {partner.native.map((l) => l.name).join(", ")} →{" "}
            {partner.learning.map((l) => l.name).join(", ")}
          </p>

          {/* Waveform */}
          <div className="mt-8 flex h-16 items-end gap-1">
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-primary"
                style={{
                  height: "100%",
                  animation: `waveform 1s ease-in-out ${i * 0.06}s infinite`,
                }}
              />
            ))}
          </div>

          {translation && (
            <div className="mt-6 max-w-md rounded-lg bg-white/10 px-4 py-2 text-sm text-white/80">
              &ldquo;Me encanta viajar&rdquo; → &ldquo;I love to travel&rdquo;
            </div>
          )}
        </div>

        {/* Prompts panel */}
        <aside
          className={cn(
            "absolute inset-y-0 right-0 z-30 w-80 max-w-[85%] transform border-l border-white/10 bg-zinc-900 p-5 transition-transform",
            panelOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <Lightbulb className="size-4 text-primary" /> AI Prompts
            </h3>
            <Button variant="ghost" size="icon-sm" onClick={() => setPanelOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {aiPrompts.map((p, i) => (
              <div key={i} className="rounded-lg bg-white/5 p-3 text-sm text-white/90">
                {p}
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between rounded-lg bg-white/5 p-3">
            <span className="flex items-center gap-2 text-sm">
              <Languages className="size-4 text-primary" /> Live translation
            </span>
            <button
              onClick={() => setTranslation((v) => !v)}
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                translation ? "bg-primary" : "bg-white/20"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-4 rounded-full bg-white transition-transform",
                  translation ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </button>
          </div>
        </aside>
      </div>

      {/* Bottom controls */}
      <div className="relative flex items-center justify-center gap-2 px-4 py-6 sm:gap-3">
        {pickerOpen && (
          <div className="absolute bottom-24 flex gap-1 rounded-full bg-zinc-800 p-2 shadow-xl">
            {reactions.map((r) => (
              <button
                key={r}
                onClick={() => sendReaction(r)}
                className="flex size-10 items-center justify-center rounded-full text-2xl transition-transform hover:scale-125"
              >
                {r}
              </button>
            ))}
          </div>
        )}

        <ControlButton
          onClick={() => setMuted((m) => !m)}
          active={muted}
          label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </ControlButton>

        <ControlButton disabled label="Video locked">
          <Video className="size-5" />
        </ControlButton>

        <ControlButton onClick={() => setPickerOpen((v) => !v)} label="React">
          <Smile className="size-5" />
        </ControlButton>

        <ControlButton onClick={() => setPanelOpen((v) => !v)} label="Prompts">
          <Lightbulb className="size-5" />
        </ControlButton>

        <button
          onClick={() => router.push("/dashboard")}
          className="flex h-14 items-center gap-2 rounded-full bg-red-600 px-6 font-medium text-white transition-colors hover:bg-red-700"
        >
          <PhoneOff className="size-5" /> End
        </button>
      </div>
    </div>
  )
}

function ControlButton({
  children,
  onClick,
  active,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-14 items-center justify-center rounded-full transition-colors",
        active ? "bg-primary text-white" : "bg-white/10 text-white hover:bg-white/20",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      {children}
    </button>
  )
}
