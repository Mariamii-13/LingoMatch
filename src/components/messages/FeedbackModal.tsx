"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/** Relocated out of `[conversationId]/page.tsx` (roadmap #16), unchanged. */
export function FeedbackModal({
  onSubmit,
  onSkip,
}: {
  onSubmit: (
    rating: number,
    wouldTalkAgain: boolean,
    note: string
  ) => Promise<void>
  onSkip: () => void
}) {
  const [rating, setRating] = React.useState(0)
  const [wouldTalkAgain, setWouldTalkAgain] = React.useState<boolean | null>(
    null
  )
  const [note, setNote] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const canSubmit = rating > 0 && wouldTalkAgain !== null && !busy

  async function handleSubmit() {
    if (!canSubmit) return
    setBusy(true)
    await onSubmit(rating, wouldTalkAgain!, note)
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold">How was this conversation?</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your feedback improves future matches.
        </p>

        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={cn(
                "text-3xl transition-transform hover:scale-110",
                star <= rating
                  ? "text-amber-400"
                  : "text-muted-foreground/25 hover:text-amber-300"
              )}
            >
              ★
            </button>
          ))}
        </div>

        <p className="mt-5 text-sm font-medium">
          Would you talk with this person again?
        </p>
        <div className="mt-2 flex gap-3">
          {(
            [
              {
                label: "Yes",
                value: true,
                active:
                  "border-emerald-500 bg-emerald-500/10 text-emerald-500",
              },
              {
                label: "No",
                value: false,
                active: "border-rose-500 bg-rose-500/10 text-rose-500",
              },
            ] as const
          ).map(({ label, value, active }) => (
            <button
              key={label}
              onClick={() => setWouldTalkAgain(value)}
              className={cn(
                "flex-1 rounded-xl border py-2 text-sm font-medium transition-colors",
                wouldTalkAgain === value ? active : "hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything else? (optional)"
          maxLength={500}
          rows={2}
          className="mt-4 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        />

        <div className="mt-4 flex flex-col gap-2">
          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Submit Feedback
          </Button>
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={onSkip}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  )
}
