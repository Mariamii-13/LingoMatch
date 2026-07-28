"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChevronUp, Lightbulb, TrendingUp, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  dauTrend,
  mockFeedback,
  mrrData,
  retentionRisks,
  roadmapSuggestions,
  sentimentData,
  sessionsByMode,
} from "@/lib/admin-placeholder-data"

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
}

const impactStyles: Record<string, string> = {
  High: "bg-emerald-500/15 text-emerald-600",
  Medium: "bg-amber-500/15 text-amber-600",
  Low: "bg-zinc-500/15 text-zinc-500",
}

const severityStyles: Record<string, string> = {
  High: "bg-destructive/15 text-destructive",
  Medium: "bg-amber-500/15 text-amber-600",
  Low: "bg-zinc-500/15 text-zinc-500",
}

export default function AdminAnalyticsPage() {
  const topFeedback = [...mockFeedback].sort((a, b) => b.votes - a.votes).slice(0, 4)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Founder Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Growth, sentiment, revenue and what to build next.
        </p>
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Daily Active Users (30 days)</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dauTrend} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="users" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Sessions by Mode</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionsByMode} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mode" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="sessions" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Sentiment</h3>
          <div className="mt-4 flex h-60 items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {sentimentData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex-1 space-y-2 text-sm">
              {sentimentData.map((s) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span className="size-3 rounded-full" style={{ background: s.color }} />
                  {s.name} <span className="ml-auto font-medium">{s.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Revenue (MRR)</h3>
          <div className="mt-4 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData} margin={{ left: -5, right: 10 }}>
                <defs>
                  <linearGradient id="mrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="mrr" stroke="var(--primary)" strokeWidth={2} fill="url(#mrr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Insights row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top feedback */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <TrendingUp className="size-4 text-primary" /> Top Feedback
          </h3>
          <ul className="mt-4 space-y-3">
            {topFeedback.map((f) => (
              <li key={f.id} className="flex items-start gap-2 text-sm">
                <span className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                  <ChevronUp className="size-3" /> {f.votes}
                </span>
                <span className="flex-1">{f.title}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Roadmap */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <Lightbulb className="size-4 text-primary" /> AI Roadmap
          </h3>
          <ul className="mt-4 space-y-3">
            {roadmapSuggestions.map((r) => (
              <li key={r.title} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", impactStyles[r.impact])}>
                    {r.impact}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.rationale}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Retention risks */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-4 text-amber-500" /> Retention Risks
          </h3>
          <ul className="mt-4 space-y-3">
            {retentionRisks.map((r) => (
              <li key={r.signal} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.signal}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", severityStyles[r.severity])}>
                    {r.severity}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
