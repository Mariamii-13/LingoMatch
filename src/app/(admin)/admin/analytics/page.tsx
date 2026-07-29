import type { Metadata } from "next"
import Link from "next/link"
import { BarChart3, Database, TrendingUp } from "lucide-react"

export const metadata: Metadata = { title: "Analytics" }

/**
 * Every chart this page used to render — daily actives, sessions by mode,
 * sentiment, MRR, retention risks, roadmap suggestions — was drawn from
 * hard-coded numbers with no data source behind any of them. A dashboard that
 * invents its own figures is worse than an empty one: it invites decisions
 * based on fiction.
 *
 * Restore each section only alongside the query or event stream that feeds it.
 */
const PLANNED = [
  {
    title: "Daily and weekly actives",
    needs: "Session-level event tracking, which does not exist yet.",
  },
  {
    title: "Sessions by practice mode",
    needs: "Mode recorded per conversation and per tutor session, then aggregated.",
  },
  {
    title: "Retention and churn signals",
    needs: "A cohort table built from sign-up and return dates.",
  },
  {
    title: "Revenue",
    needs: "A billing provider. LingoMatch has no paid plans during the preview.",
  },
]

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Product metrics, once the events behind them are recorded.
        </p>
      </div>

      <section className="rounded-2xl border bg-card px-6 py-10 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BarChart3 className="size-7" />
        </span>
        <h2 className="mt-5 text-lg font-semibold">No analytics are being collected yet</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          This page previously showed charts built from placeholder numbers. They have been
          removed rather than left to look real. For figures that are genuinely live, see the
          totals on the admin dashboard or browse the collections directly.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link href="/admin/dashboard" className="text-primary hover:underline">
            Dashboard totals
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link href="/admin/database" className="text-primary hover:underline">
            Database browser
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="size-4 text-muted-foreground" />
          <h2 className="font-semibold">Planned metrics</h2>
        </div>
        <ul className="divide-y rounded-xl border bg-card shadow-sm">
          {PLANNED.map((item) => (
            <li key={item.title} className="px-5 py-4">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
                <Database className="mt-0.5 size-3.5 shrink-0" />
                {item.needs}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
