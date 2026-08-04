"use client"

import { MessageSquare, Mic, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { MatchResult } from "@/types"
import { FlagImage } from "@/components/shared/flag-image"

interface MatchFoundModalProps {
  result: MatchResult
  // Found live while verifying 18.5's voice-first redesign: this modal is
  // shared by all three match flows but its CTA used to always read "Start
  // Chat," even for a voice or video match about to open a live call.
  mode?: "chat" | "video" | "voice"
  onStartChat: () => void
  onSkip: () => void
}

const CTA_BY_MODE = {
  chat: { label: "Start Chat", icon: MessageSquare, className: "bg-blue-600 hover:bg-blue-700" },
  video: { label: "Join Video Call", icon: Video, className: "bg-violet-600 hover:bg-violet-700" },
  voice: { label: "Join Voice Call", icon: Mic, className: "bg-amber-600 hover:bg-amber-700" },
} as const

export function MatchFoundModal({ result, mode = "chat", onStartChat, onSkip }: MatchFoundModalProps) {
  const { partner, compatibilityPct } = result
  const cta = CTA_BY_MODE[mode]
  const CtaIcon = cta.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl">
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          🎉 Match Found
        </p>

        <Avatar className="mx-auto size-20">
          <AvatarFallback className={`bg-gradient-to-br ${partner.avatarColor} text-xl font-semibold text-white`}>
            {partner.avatarInitials}
          </AvatarFallback>
        </Avatar>

        <h2 className="mt-3 text-lg font-semibold">{partner.name}</h2>
        <p className="text-sm text-muted-foreground">
          {partner.country || "Unknown country"}
        </p>

        <div className="mx-auto mt-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          ✦ {compatibilityPct}% Match
        </div>

        {(partner.native as { name: string; flag: string }[]).length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {(partner.native as { name: string; flag: string }[]).map((l) => (
              <span
                key={l.name}
                className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                <FlagImage flag={l.flag} /> {l.name} · Native
              </span>
            ))}
            {(partner.learning as { name: string; flag: string }[]).map((l) => (
              <span
                key={l.name}
                className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                <FlagImage flag={l.flag} /> {l.name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button className={`w-full text-white ${cta.className}`} onClick={onStartChat}>
            <CtaIcon className="size-4" /> {cta.label}
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
            Skip this match
          </Button>
        </div>
      </div>
    </div>
  )
}
