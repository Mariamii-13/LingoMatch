"use client"

import { MessageSquare, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { MatchResult } from "@/types"

interface MatchFoundModalProps {
  result: MatchResult
  onStartChat: () => void
  onJoinVideo: () => void
  onSkip: () => void
}

export function MatchFoundModal({ result, onStartChat, onJoinVideo, onSkip }: MatchFoundModalProps) {
  const { partner, compatibilityPct } = result

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl">
        <Badge className="mx-auto mb-4 bg-emerald-500 hover:bg-emerald-500">
          ● Match Found
        </Badge>

        <Avatar className="mx-auto size-20">
          <AvatarFallback className={`bg-gradient-to-br ${partner.avatarColor} text-xl text-white`}>
            {partner.avatarInitials}
          </AvatarFallback>
        </Avatar>

        <h2 className="mt-3 text-lg font-semibold">
          {partner.name} {partner.flag}
        </h2>
        <p className="text-sm text-muted-foreground">{partner.country}</p>

        <div className="mx-auto mt-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          ✦ {compatibilityPct}% Match
        </div>

        {(partner.native as { name: string }[]).length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {(partner.native as { name: string }[]).map((l) => (
              <span key={l.name} className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                {l.name} · Native
              </span>
            ))}
            {(partner.learning as { name: string }[]).map((l) => (
              <span key={l.name} className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                {l.name}
              </span>
            ))}
          </div>
        )}

        {(partner.interests as string[]).length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {(partner.interests as string[]).slice(0, 3).map((i) => (
              <span key={i} className="rounded-md border bg-muted/50 px-2 py-0.5 text-xs">
                {i}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={onStartChat}>
            <MessageSquare className="size-4" /> Start Chat
          </Button>
          <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={onJoinVideo}>
            <Video className="size-4" /> Join Video Session
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
            Skip this match
          </Button>
        </div>
      </div>
    </div>
  )
}
