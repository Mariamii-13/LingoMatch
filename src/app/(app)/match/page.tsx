"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Mic, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { conversationModes, languageOptions, mockUsers } from "@/lib/mock-data"

type Phase = "idle" | "searching" | "found"

const matchedPartner = mockUsers[0]

export default function MatchPage() {
  const router = useRouter()
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [mode, setMode] = React.useState("friendly")
  const [language, setLanguage] = React.useState("JA")

  React.useEffect(() => {
    if (phase !== "searching") return
    const t = setTimeout(() => setPhase("found"), 3000)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === "searching") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="relative flex size-32 items-center justify-center">
          <span className="absolute size-32 animate-ping rounded-full bg-primary/20" />
          <span className="absolute size-24 animate-pulse rounded-full bg-primary/30" />
          <Loader2 className="size-12 animate-spin text-primary" />
        </div>
        <h2 className="mt-8 text-xl font-semibold">Finding your perfect match...</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Estimated wait: ~5 seconds
        </p>
        <Button variant="outline" className="mt-8" onClick={() => setPhase("idle")}>
          <X className="size-4" /> Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Find Your Match</h1>
        <p className="mt-1 text-muted-foreground">
          Choose a mode and language to start a live voice conversation.
        </p>
      </div>

      {/* Mode selection */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Conversation mode
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {conversationModes.map((m) => {
            const active = mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "relative rounded-xl border p-4 text-left transition-colors",
                  active ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                )}
              >
                {active && (
                  <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
                <div className="text-2xl">{m.emoji}</div>
                <h3 className="mt-2 text-sm font-semibold">{m.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* Language */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Practice language
        </h2>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                language === l.code
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <span>{l.flag}</span> {l.name}
            </button>
          ))}
        </div>
      </section>

      <Button size="lg" className="h-12 w-full px-6 text-base sm:w-auto" onClick={() => setPhase("searching")}>
        <Mic className="size-5" /> Start Matching
      </Button>

      {/* Match found overlay */}
      {phase === "found" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl">
            <Badge className="mx-auto">Match Found! 🎉</Badge>
            <Avatar size="lg" className="mx-auto mt-4 size-20">
              <AvatarFallback className={`bg-gradient-to-br ${matchedPartner.avatarColor} text-white text-xl`}>
                {matchedPartner.avatarInitials}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-lg font-semibold">
              {matchedPartner.name} {matchedPartner.flag}
            </h2>
            <p className="text-sm text-muted-foreground">
              {matchedPartner.country} · learning{" "}
              {matchedPartner.learning.map((l) => l.name).join(", ")}
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setPhase("idle")}>
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push(`/session/${matchedPartner.id}`)}
              >
                Join Call
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
