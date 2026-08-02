"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { Partner } from "@/app/(app)/messages/[conversationId]/use-conversation-thread"

const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Inappropriate Content",
  "Fake Profile",
  "Other",
] as const

/**
 * Relocated out of `[conversationId]/page.tsx` (roadmap #16), unchanged —
 * see that file's history and `use-conversation-thread.ts`'s header comment
 * for the same split applied to the thread's network/realtime logic.
 */
export function ReportModal({
  partner,
  sessionId,
  onClose,
}: {
  partner: Partner
  sessionId: string
  onClose: () => void
}) {
  const [reason, setReason] = React.useState("")
  const [details, setDetails] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState(false)

  async function handleSubmit() {
    if (!reason) return
    setBusy(true)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId: partner.id,
          conversationId: sessionId,
          reason,
          details,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Failed to submit report")
        return
      }
      setDone(true)
      setTimeout(onClose, 1800)
    } catch {
      toast.error("Failed to submit report")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        {done ? (
          <div className="py-6 text-center">
            <p className="text-3xl">✓</p>
            <p className="mt-2 font-semibold">Report submitted</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Our moderation team will review it shortly.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Report User</h2>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Reporting{" "}
              <span className="font-medium text-foreground">{partner.name}</span>
            </p>

            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    reason === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)"
              maxLength={500}
              rows={2}
              className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            />

            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-rose-600 text-white hover:bg-rose-700"
                disabled={!reason || busy}
                onClick={handleSubmit}
              >
                {busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Submit Report
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
