"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MatchConfigForm } from "@/components/match/MatchConfigForm"
import { SearchingState } from "@/components/match/SearchingState"
import { MatchFoundModal } from "@/components/match/MatchFoundModal"
import type { MatchPhase, MatchResult } from "@/types"

export default function ChatMatchPage() {
  const router = useRouter()
  const [phase, setPhase] = React.useState<MatchPhase>("idle")
  const [targetLanguage, setTargetLanguage] = React.useState("KO")
  const [nativeLanguage, setNativeLanguage] = React.useState("EN")
  const [interests, setInterests] = React.useState<string[]>([])
  const [matchResult, setMatchResult] = React.useState<MatchResult | null>(null)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
  }

  const handleFind = async () => {
    setPhase("searching")
    const res = await fetch("/api/match/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLanguage, nativeLanguage, interests }),
    })
    const data = await res.json()

    if (data.matched) {
      setMatchResult(data)
      setPhase("found")
      return
    }

    pollRef.current = setInterval(async () => {
      const poll = await fetch(`/api/match/chat?requestId=${data.requestId}`)
      const pollData = await poll.json()
      if (pollData.matched) {
        stopPolling()
        setMatchResult(pollData)
        setPhase("found")
      }
    }, 2000)
  }

  React.useEffect(() => () => stopPolling(), [])

  if (phase === "searching") return <SearchingState onCancel={() => { stopPolling(); setPhase("idle") }} />

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
            <MessageSquare className="size-5" />
          </div>
          <h1 className="text-2xl font-bold">Chat Match</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Find a text conversation partner</p>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <MatchConfigForm
          targetLanguage={targetLanguage}
          nativeLanguage={nativeLanguage}
          interests={interests}
          onTargetLanguage={setTargetLanguage}
          onNativeLanguage={setNativeLanguage}
          onInterests={setInterests}
        />

        <div className="mt-6 border-t pt-5">
          <Button
            size="lg"
            className="h-12 w-full bg-blue-600 text-base hover:bg-blue-700"
            disabled={!targetLanguage || !nativeLanguage}
            onClick={handleFind}
          >
            <MessageSquare className="size-5" /> Find Chat Partner
          </Button>
        </div>
      </div>

      {matchResult && phase === "found" && (
        <MatchFoundModal
          result={matchResult}
          onStartChat={() => router.push(`/session/chat/${matchResult.conversationId}`)}
          onJoinVideo={() => router.push(`/session/video/${matchResult.conversationId}`)}
          onSkip={() => { setMatchResult(null); setPhase("idle") }}
        />
      )}
    </div>
  )
}
