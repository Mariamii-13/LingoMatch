"use client"

import * as React from "react"
import Link from "next/link"
import { BarChart3, FileStack, MessageSquare, Network, Users } from "lucide-react"

import { cn } from "@/lib/utils"

type Stats = {
  totalUsers: number
  activeUsers: number
  totalUploads: number
  totalMatches: number
  totalMessages: number
}

type RecentReport = {
  id: string
  reporter: string
  reportedUsername: string
  reason: string
  status: string
  createdAt: string
}

const statusStyles: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-600",
  reviewed: "bg-blue-500/15 text-blue-500",
  resolved: "bg-emerald-500/15 text-emerald-600",
  dismissed: "bg-zinc-500/15 text-zinc-500",
}

export default function AdminDashboardPage() {
  const [stats, setStats] = React.useState<Stats | null>(null)
  const [reports, setReports] = React.useState<RecentReport[] | null>(null)

  React.useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => null)
  }, [])

  React.useEffect(() => {
    fetch("/api/admin/reports?limit=5")
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((data) => setReports(Array.isArray(data.reports) ? data.reports : []))
      .catch(() => setReports([]))
  }, [])

  const cards = [
    {
      label: "Total Users",
      value: stats?.totalUsers.toLocaleString() ?? "—",
      icon: Users,
      sub: `${stats?.activeUsers.toLocaleString() ?? "—"} active`,
    },
    {
      label: "Total Uploads",
      value: stats?.totalUploads.toLocaleString() ?? "—",
      icon: FileStack,
      sub: "files on Cloudinary",
    },
    {
      label: "Total Matches",
      value: stats?.totalMatches.toLocaleString() ?? "—",
      icon: Network,
      sub: "conversations started",
    },
    {
      label: "Total Messages",
      value: stats?.totalMessages.toLocaleString() ?? "—",
      icon: MessageSquare,
      sub: "across all sessions",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Platform health at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <div key={c.label} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <Icon className="size-4 text-primary" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold">{c.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/*
        Time-series charts lived here, drawn from invented numbers. Nothing
        records daily actives or per-mode session counts yet, so rather than
        show a convincing shape that means nothing, say so.
      */}
      <div className="rounded-xl border border-dashed bg-muted/20 p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="size-5" />
          </span>
          <div>
            <h3 className="font-semibold">Usage trends are not instrumented yet</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Daily actives and sessions-by-mode need event tracking that does not exist
              yet. The totals above are live counts from the database; no estimated or
              sample figures appear anywhere on this page.
            </p>
          </div>
        </div>
      </div>

      {/* Recent reports */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <h3 className="font-semibold">Recent Reports</h3>
          <Link href="/admin/reports" className="text-sm text-primary hover:underline">
            Open queue
          </Link>
        </div>
        {reports !== null && reports.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No reports have been filed.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Reporter</th>
                  <th className="px-5 py-3 font-medium">Reported</th>
                  <th className="px-5 py-3 font-medium">Reason</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(reports ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3">@{r.reporter}</td>
                    <td className="px-5 py-3">@{r.reportedUsername}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.reason}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          statusStyles[r.status] ?? "bg-zinc-500/15 text-zinc-500",
                        )}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
