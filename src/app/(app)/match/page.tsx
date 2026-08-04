import type { Metadata } from "next"
import Link from "next/link"
import { MessageSquare, Mic, Video } from "lucide-react"

export const metadata: Metadata = { title: "Find a match" }

// Voice leads (18.5): first, and the only card styled as a clear default.
// Text is framed as a supporting mode; Video is an alternative entry point
// into the same kind of room for anyone who wants their camera on from the
// start, rather than a competing default — see PROJECT_PASSPORT.md §18.5.
export default function MatchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Find a Match</h1>
        <p className="mt-1 text-muted-foreground">Choose how you want to connect</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/match/voice"
          className="flex flex-col gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 transition-colors hover:border-amber-500/50 hover:bg-amber-500/10 sm:col-span-2"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500 text-white">
            <Mic className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Voice Practice</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live conversation, no camera needed. Fastest to match, nothing to set up — and you
              can turn your camera on anytime once you&apos;re already talking.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Live conversation", "No camera required", "In-call chat"].map((t) => (
              <span key={t} className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        </Link>

        <Link
          href="/match/chat"
          className="flex flex-col gap-4 rounded-2xl border bg-card p-6 transition-colors hover:border-blue-500/50 hover:bg-blue-500/5"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
            <MessageSquare className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Text Practice</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Best for coordinating, sharing a note or link, or practising when voice isn&apos;t
              an option right now.
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
            <h2 className="text-lg font-semibold">Video Call</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Same live room as Voice Practice — just with your camera on from the start.
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
