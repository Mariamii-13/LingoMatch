"use client"

import { useEffect, useState } from "react"
import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SearchingStateProps {
  onCancel: () => void
}

export function SearchingState({ onCancel }: SearchingStateProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const timeStr = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="relative flex size-32 items-center justify-center">
        <span className="absolute size-32 animate-ping rounded-full bg-primary/20" />
        <span className="absolute size-24 animate-pulse rounded-full bg-primary/30" />
        <Loader2 className="size-12 animate-spin text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Finding your partner...</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Matching you with someone who speaks your target language
        </p>
        <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-muted-foreground">
          {timeStr}
        </p>
      </div>
      <Button variant="outline" onClick={onCancel}>
        <X className="size-4" /> Cancel
      </Button>
    </div>
  )
}
