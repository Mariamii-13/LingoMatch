"use client"

import * as React from "react"
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export type ReviewItem = {
  id: string
  skillTag: string
  targetLanguageCode: string
  exampleCorrection: string
  dueAt: string
}

/** "preterite-vs-present" -> "Preterite vs present" — a plain-language label, never shown as raw model metadata. */
function formatSkillTag(tag: string): string {
  const spaced = tag.replace(/-/g, " ")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export function ReviewClient({ initialItems }: { initialItems: ReviewItem[] }) {
  const items = initialItems
  const [index, setIndex] = React.useState(0)
  const [revealed, setRevealed] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState("")

  const current = items[index]
  const remaining = items.length - index

  async function submitOutcome(remembered: boolean) {
    if (!current || submitting) return
    setSubmitting(true)
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: current.id, remembered }),
      })
    } catch {
      // Best-effort: the schedule just won't advance for this item if the
      // request fails, which is safe — it stays due and shows again later,
      // never silently lost.
    } finally {
      setRevealed(false)
      setIndex((i) => i + 1)
      setAnnouncement(
        remembered ? "Marked as remembered." : "Marked as forgotten — you'll see this again soon.",
      )
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review</CardTitle>
          <CardDescription>
            Nothing due right now. As the AI tutor corrects real mistakes, they&apos;ll show up
            here for spaced review.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All caught up</CardTitle>
          <CardDescription>You reviewed everything due today. Nice work.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="size-5 text-primary" aria-hidden="true" />
            Review
          </CardTitle>
          <CardDescription>
            {remaining} {remaining === 1 ? "item" : "items"} left today &middot;{" "}
            {formatSkillTag(current.skillTag)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Do you remember the correct way to say this?
          </p>
          {revealed ? (
            <p className="rounded-lg bg-muted px-4 py-3 text-sm font-medium">
              {current.exampleCorrection}
            </p>
          ) : (
            <Button variant="outline" onClick={() => setRevealed(true)}>
              Show answer
            </Button>
          )}
        </CardContent>
        {revealed && (
          <CardFooter className="gap-2">
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => submitOutcome(false)}
              className="gap-2"
            >
              <XCircle className="size-4" aria-hidden="true" />
              I didn&apos;t remember
            </Button>
            <Button disabled={submitting} onClick={() => submitOutcome(true)} className="gap-2">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              I remembered
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
