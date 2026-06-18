"use client"

import * as React from "react"
import { Radio } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

type Session = {
  _id: string
  participants?: { userId?: string; displayName?: string }[]
  status?: string
  mode?: string
  createdAt?: string
  endedAt?: string | null
  messageCount?: number
}

type DocsResult = { docs: Session[]; total: number; page: number; pages: number }

export default function AdminSessionsPage() {
  const [result, setResult] = React.useState<DocsResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/db/conversations?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((data) => setResult(data))
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Radio className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Sessions</h1>
          <p className="mt-0.5 text-muted-foreground">
            {result ? `${result.total} total conversations` : "Loading…"}
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
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Messages</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Ended</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {result?.docs.map((s) => (
                <tr key={String(s._id)} className="transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    …{String(s._id).slice(-8)}
                  </td>
                  <td className="px-4 py-3 capitalize">{s.mode ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={s.status === "active" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {s.status ?? "unknown"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.messageCount ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.endedAt ? new Date(s.endedAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {result?.docs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No sessions found.
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
