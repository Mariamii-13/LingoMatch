import type { Metadata } from "next"
import Link from "next/link"
import { MessageSquare, Video } from "lucide-react"

export const metadata: Metadata = { title: "Find a match" }

export default function MatchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Find a Match</h1>
        <p className="mt-1 text-muted-foreground">Choose how you want to connect</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/match/chat"
          className="flex flex-col gap-4 rounded-2xl border bg-card p-6 transition-colors hover:border-blue-500/50 hover:bg-blue-500/5"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
            <MessageSquare className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Chat Match</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Text-based language exchange. No camera required — just type and connect.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Instant", "Text only", "Save history"].map((t) => (
              <span key={t} className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        </Link>

        <Link
          href="/match/video"
          className="flex flex-col gap-4 rounded-2xl border bg-card p-6 transition-colors hover:border-violet-500/50 hover:bg-violet-500/5"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
            <Video className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Video Match</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Video + voice + chat. Camera optional — voice-only mode available.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Video", "Voice", "In-call chat"].map((t) => (
              <span key={t} className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        </Link>
      </div>
    </div>
  )
}
