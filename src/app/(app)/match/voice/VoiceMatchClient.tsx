"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Mic } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MatchConfigForm } from "@/components/match/MatchConfigForm"
import { SearchingState } from "@/components/match/SearchingState"
import { MatchFoundModal } from "@/components/match/MatchFoundModal"
import { PreJoinScreen } from "@/components/session/PreJoinScreen"
import { requestMatchNotificationPermission, useMatchFoundNotification } from "@/hooks/use-match-notification"
import type { MatchDefaults } from "@/lib/match-defaults"
import type { MatchPhase, MatchResult } from "@/types"

export function VoiceMatchClient({ defaults }: { defaults: MatchDefaults }) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<MatchPhase>("idle")
  const [targetLanguage, setTargetLanguage] = React.useState(defaults.targetLanguage)
  const [nativeLanguage, setNativeLanguage] = React.useState(defaults.nativeLanguage)
  const [interests, setInterests] = React.useState<string[]>([])
  const [matchResult, setMatchResult] = React.useState<MatchResult | null>(null)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const requestIdRef = React.useRef<string | null>(null)
  // Camera never applies here — only the mic choice needs to survive into the session.
  const devicePrefsRef = React.useRef({ mic: true })

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  const cancelRequest = React.useCallback((id: string | null) => {
    if (!id) return
    navigator.sendBeacon(`/api/match/voice/cancel?requestId=${id}`)
    requestIdRef.current = null
  }, [])

  const handleCancel = () => {
    stopPolling()
    cancelRequest(requestIdRef.current)
    setPhase("prejoin")
  }

  const startSearching = async (_cameraEnabled: boolean, micEnabled: boolean) => {
    devicePrefsRef.current = { mic: micEnabled }
    requestMatchNotificationPermission()
    setPhase("searching")
    const res = await fetch("/api/match/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLanguage, nativeLanguage, interests }),
    })
    if (!res.ok) {
      const failure = await res.json().catch(() => ({}))
      setPhase("idle")
      toast.error(failure.error ?? "Failed to join queue. Please try again.")
      return
    }
    const data = await res.json()

    if (data.matched) {
      setMatchResult(data)
      setPhase("found")
      return
    }

    requestIdRef.current = data.requestId

    pollRef.current = setInterval(async () => {
      const poll = await fetch(`/api/match/voice?requestId=${data.requestId}`)
      const pollData = await poll.json()
      if (pollData.matched) {
        stopPolling()
        requestIdRef.current = null
        setMatchResult(pollData)
        setPhase("found")
      } else if (pollData.expired || pollData.cancelled) {
        stopPolling()
        requestIdRef.current = null
        setPhase("prejoin")
      }
    }, 2000)
  }

  React.useEffect(() => {
    const onUnload = () => cancelRequest(requestIdRef.current)
    window.addEventListener("beforeunload", onUnload)
    return () => {
      window.removeEventListener("beforeunload", onUnload)
      stopPolling()
      cancelRequest(requestIdRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useMatchFoundNotification(phase, matchResult)

  if (phase === "searching") return (
    <SearchingState onCancel={handleCancel} />
  )

  if (phase === "prejoin") return (
    <PreJoinScreen
      voiceOnly
      onFindPartner={startSearching}
      onCancel={() => setPhase("idle")}
    />
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
            <Mic className="size-5" />
          </div>
          <h1 className="text-2xl font-bold">Voice Match</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Connect over live audio — no camera, nothing to set up</p>
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

        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300">
          🎙️ Microphone setup on the next screen.
        </div>

        <div className="mt-4 border-t pt-5">
          <Button
            size="lg"
            className="h-12 w-full bg-amber-600 text-base hover:bg-amber-700"
            disabled={!targetLanguage || !nativeLanguage}
            onClick={() => setPhase("prejoin")}
          >
            <Mic className="size-5" /> Continue to Preview
          </Button>
        </div>
      </div>

      {matchResult && phase === "found" && (
        <MatchFoundModal
          result={matchResult}
          onStartChat={() => {
            const { mic } = devicePrefsRef.current
            router.push(`/session/voice/${matchResult.conversationId}?mic=${mic ? "1" : "0"}`)
          }}
          onSkip={() => { setMatchResult(null); setPhase("idle") }}
        />
      )}
    </div>
  )
}
