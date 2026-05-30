"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { DollarSign, FileWarning, Mic, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { adminReports, adminStats, dauTrend, sessionsByMode } from "@/lib/mock-data"

const cards = [
  { label: "Daily Active Users", value: adminStats.dau.toLocaleString(), icon: Users, change: "+4.2%" },
  { label: "Sessions Today", value: adminStats.sessionsToday.toLocaleString(), icon: Mic, change: "+1.8%" },
  { label: "Revenue Today", value: `$${adminStats.revenueToday.toLocaleString()}`, icon: DollarSign, change: "+6.1%" },
  { label: "Open Reports", value: adminStats.openReports, icon: FileWarning, change: "-2" },
]

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  reviewed: "bg-blue-500/15 text-blue-500",
  dismissed: "bg-zinc-500/15 text-zinc-500",
}

export default function AdminDashboardPage() {
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
              <div className="mt-2 flex items-end justify-between">
                <p className="text-2xl font-bold">{c.value}</p>
                <Badge variant="secondary">{c.change}</Badge>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">DAU Trend</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dauTrend} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="users" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">Sessions by Mode</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionsByMode} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mode" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  cursor={{ fill: "var(--accent)" }}
                />
                <Bar dataKey="sessions" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent reports */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h3 className="font-semibold">Recent Reports</h3>
        </div>
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
              {adminReports.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">@{r.reporter}</td>
                  <td className="px-5 py-3">@{r.reported}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.reason}</td>
                  <td className="px-5 py-3 text-muted-foreground">{r.date}</td>
                  <td className="px-5 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", statusStyles[r.status])}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
