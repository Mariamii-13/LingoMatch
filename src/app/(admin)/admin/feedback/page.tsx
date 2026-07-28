"use client"

import * as React from "react"
import { MessageSquare, Star } from "lucide-react"
import { toast } from "sonner"

type Feedback = {
  _id: string
  sessionId?: string
  userId?: string
  rating?: number
  comment?: string
  createdAt?: string
}

type DocsResult = { docs: Feedback[]; total: number; page: number; pages: number }

function Stars({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  )
}

export default function AdminFeedbackPage() {
  const [result, setResult] = React.useState<DocsResult | null>(null)
  const [loadedPage, setLoadedPage] = React.useState<number | null>(null)
  const [page, setPage] = React.useState(1)

  // Derived rather than a flag — see the note in the sessions page.
  const loading = loadedPage !== page

  React.useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/db/conversationfeedbacks?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setResult(data)
        setLoadedPage(page)
      })
      .catch(() => {
        if (cancelled) return
        toast.error("Failed to load feedback")
        setLoadedPage(page)
      })
    return () => {
      cancelled = true
    }
  }, [page])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Feedback</h1>
          <p className="mt-0.5 text-muted-foreground">
            {result ? `${result.total} total feedback entries` : "Loading…"}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Comment</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {result?.docs.map((f) => (
                <tr key={String(f._id)} className="transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    …{String(f._id).slice(-8)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {f.sessionId ? `…${String(f.sessionId).slice(-8)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Stars rating={f.rating} />
                  </td>
                  <td className="max-w-xs px-4 py-3 text-muted-foreground">
                    <p className="truncate">{f.comment ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {result?.docs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No feedback found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {result && result.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {result.page} of {result.pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-accent"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(result.pages, p + 1))}
              disabled={page >= result.pages}
              className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-accent"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
