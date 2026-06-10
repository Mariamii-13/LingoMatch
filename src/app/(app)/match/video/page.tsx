"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MatchConfigForm } from "@/components/match/MatchConfigForm"
import { SearchingState } from "@/components/match/SearchingState"
import { MatchFoundModal } from "@/components/match/MatchFoundModal"
import { PreJoinScreen } from "@/components/session/PreJoinScreen"
import type { MatchPhase, MatchResult } from "@/types"

export default function VideoMatchPage() {
  const router = useRouter()
  const [phase, setPhase] = React.useState<MatchPhase>("idle")
  const [targetLanguage, setTargetLanguage] = React.useState("KO")
  const [nativeLanguage, setNativeLanguage] = React.useState("EN")
  const [interests, setInterests] = React.useState<string[]>([])
  const [matchResult, setMatchResult] = React.useState<MatchResult | null>(null)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => { if (pollRef.current) clearInterval(pollRef.current) }

  const startSearching = async () => {
    setPhase("searching")
    const res = await fetch("/api/match/video", {
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
      const poll = await fetch(`/api/match/video?requestId=${data.requestId}`)
      const pollData = await poll.json()
      if (pollData.matched) {
        stopPolling()
        setMatchResult(pollData)
        setPhase("found")
      }
    }, 2000)
  }

  React.useEffect(() => () => stopPolling(), [])

  if (phase === "searching") return (
    <SearchingState onCancel={() => { stopPolling(); setPhase("prejoin") }} />
  )

  if (phase === "prejoin") return (
    <PreJoinScreen
      onFindPartner={startSearching}
      onCancel={() => setPhase("idle")}
    />
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-500">
            <Video className="size-5" />
          </div>
          <h1 className="text-2xl font-bold">Video Match</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Connect over video, voice, or both</p>
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

        <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-violet-300">
          📹 Camera and microphone setup on the next screen.
        </div>

        <div className="mt-4 border-t pt-5">
          <Button
            size="lg"
            className="h-12 w-full bg-violet-600 text-base hover:bg-violet-700"
            disabled={!targetLanguage || !nativeLanguage}
            onClick={() => setPhase("prejoin")}
          >
            <Video className="size-5" /> Continue to Preview
          </Button>
        </div>
      </div>

      {matchResult && phase === "found" && (
        <MatchFoundModal
          result={matchResult}
          onStartChat={() => router.push(`/session/video/${matchResult.conversationId}`)}
          onSkip={() => { setMatchResult(null); setPhase("idle") }}
        />
      )}
    </div>
  )
}
