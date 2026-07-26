import { BarChart3, BookOpen, Clock3, MessageSquare } from "lucide-react"

import { Badge } from "@/components/ui/badge"

const futureMetrics = [
  { label: "Practice sessions", icon: MessageSquare },
  { label: "Languages practised", icon: BookOpen },
  { label: "Practice time", icon: Clock3 },
]

export default function ProgressPage() {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold sm:text-3xl">Progress</h1>
        <p className="mt-2 text-muted-foreground">
          Your completed practice activity will appear here as LingoMatch begins recording
          progress insights.
        </p>
      </div>

      <section className="rounded-2xl border bg-card px-6 py-12 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BarChart3 className="size-7" />
        </span>
        <h2 className="mt-5 text-lg font-semibold">Your progress starts with practice</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Complete practice sessions to build a history of your language-learning activity.
          Progress tracking is not active yet, so no estimates or sample results are shown.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-semibold">Planned activity overview</h2>
          <Badge variant="secondary">Not yet available</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {futureMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{metric.label}</span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
