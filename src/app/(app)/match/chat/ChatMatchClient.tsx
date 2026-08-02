"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MatchConfigForm } from "@/components/match/MatchConfigForm"
import { SearchingState } from "@/components/match/SearchingState"
import { MatchFoundModal } from "@/components/match/MatchFoundModal"
import { requestMatchNotificationPermission, useMatchFoundNotification } from "@/hooks/use-match-notification"
import type { MatchDefaults } from "@/lib/match-defaults"
import type { MatchPhase, MatchResult } from "@/types"

export function ChatMatchClient({ defaults }: { defaults: MatchDefaults }) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<MatchPhase>("idle")
  const [targetLanguage, setTargetLanguage] = React.useState(defaults.targetLanguage)
  const [nativeLanguage, setNativeLanguage] = React.useState(defaults.nativeLanguage)
  const [interests, setInterests] = React.useState<string[]>([])
  const [countryPreference, setCountryPreference] = React.useState("")
  const [availabilityMinutes, setAvailabilityMinutes] = React.useState(0)
  const [matchResult, setMatchResult] = React.useState<MatchResult | null>(null)
  const [requestId, setRequestId] = React.useState<string | null>(null)
  // Set once a windowed (availabilityMinutes > 0) request finds no live
  // partner immediately. Distinct from `phase`: there is nothing to poll for
  // — the match, if any, surfaces later via the dashboard's pending-match
  // card — so this just shows a static confirmation instead of a spinner.
  const [queuedForLater, setQueuedForLater] = React.useState(false)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
  }

  async function cancelQueue() {
    stopPolling()
    if (requestId) {
      await fetch(`/api/match/chat/cancel?requestId=${requestId}`, { method: "DELETE" }).catch(() => {})
    }
    setRequestId(null)
    setPhase("idle")
  }

  const handleFind = async () => {
    requestMatchNotificationPermission()
    setQueuedForLater(false)
    setPhase("searching")
    try {
      const res = await fetch("/api/match/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetLanguage, nativeLanguage, interests, countryPreference, availabilityMinutes }),
      })
      if (!res.ok) {
        // The server explains exactly what is wrong (unsupported language,
        // same language on both sides, queueing too fast) — show that instead
        // of a generic failure.
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

      if (data.availability) {
        // Windowed request, no live partner right now: nothing to poll for,
        // this is discovered later via the dashboard's pending-match card.
        setPhase("idle")
        setQueuedForLater(true)
        return
      }

      setRequestId(data.requestId)

      pollRef.current = setInterval(async () => {
        const poll = await fetch(`/api/match/chat?requestId=${data.requestId}`)
        const pollData = await poll.json()

        if (pollData.expired || pollData.cancelled) {
          stopPolling()
          setRequestId(null)
          setPhase("idle")
          toast.info("No match found. Try again!")
          return
        }

        if (pollData.matched) {
          stopPolling()
          setMatchResult(pollData)
          setPhase("found")
        }
      }, 2000)
    } catch {
      setPhase("idle")
      toast.error("Failed to join queue. Please try again.")
    }
  }

  React.useEffect(() => () => stopPolling(), [])
  useMatchFoundNotification(phase, matchResult)

  if (phase === "searching") {
    return <SearchingState onCancel={cancelQueue} />
  }

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

      {queuedForLater && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
          <p className="font-medium text-emerald-700 dark:text-emerald-400">You&apos;re on the list</p>
          <p className="mt-1 text-muted-foreground">
            No live partner right now — we&apos;ll match you as soon as one turns up, and show it
            here or on your dashboard. No need to keep this tab open.
          </p>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-6">
        <MatchConfigForm
          targetLanguage={targetLanguage}
          nativeLanguage={nativeLanguage}
          interests={interests}
          countryPreference={countryPreference}
          onTargetLanguage={setTargetLanguage}
          onNativeLanguage={setNativeLanguage}
          onInterests={setInterests}
          onCountryPreference={setCountryPreference}
          availabilityMinutes={availabilityMinutes}
          onAvailabilityMinutes={setAvailabilityMinutes}
        />

        <div className="mt-6 border-t pt-5">
          <Button
            size="lg"
            className="h-12 w-full bg-blue-600 text-base hover:bg-blue-700"
            disabled={!targetLanguage || !nativeLanguage}
            onClick={handleFind}
          >
            <MessageSquare className="size-5" />{" "}
            {availabilityMinutes === 0 ? "Find Chat Partner" : "Join with this availability"}
          </Button>
        </div>
      </div>

      {matchResult && phase === "found" && (
        <MatchFoundModal
          result={matchResult}
          onStartChat={() => router.push(`/messages/${matchResult.conversationId}`)}
          onSkip={() => { setMatchResult(null); setPhase("idle") }}
        />
      )}
    </div>
  )
}
