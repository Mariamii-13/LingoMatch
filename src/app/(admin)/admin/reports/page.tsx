"use client"

import * as React from "react"
import { AlertTriangle, Ban, Check, Clock, History, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type ReportStatus = "open" | "reviewed" | "resolved" | "dismissed"

type AdminReport = {
  id: string
  reporter: string
  reportedUsername: string
  reportedUserId: string | null
  conversationId: string | null
  reason: string
  details: string
  status: ReportStatus
  createdAt: string
}

type ModerationActionRow = {
  id: string
  actorUsername: string
  action: string
  targetUsername: string
  reason: string | null
  createdAt: string
}

const TABS: { value: ReportStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
]

const ACTION_LABELS: Record<string, string> = {
  ban: "Banned",
  unban: "Unbanned",
  report_reviewed: "Marked report reviewed",
  report_resolved: "Marked report resolved",
  report_dismissed: "Dismissed report",
}

/**
 * Read-only by design — this mirrors the append-only ModerationAction model
 * (src/lib/models/ModerationAction.ts). An audit trail an admin can edit
 * from the UI isn't an audit trail, so there is deliberately no action here
 * beyond loading and displaying it.
 */
function AuditLogTab() {
  const [actions, setActions] = React.useState<ModerationActionRow[] | null>(null)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/admin/moderation-actions")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load audit log")
        return r.json()
      })
      .then((data) => setActions(Array.isArray(data.actions) ? data.actions : []))
      .catch(() => setFailed(true))
  }, [])

  if (failed) {
    return (
      <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Could not load the moderation audit log. Refresh to try again.
      </p>
    )
  }

  if (actions === null) {
    return (
      <div role="status" aria-label="Loading audit log" className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (actions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No moderation actions recorded yet.</p>
  }

  return (
    <div className="space-y-2">
      {actions.map((a) => (
        <div key={a.id} className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <History className="size-4" />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p>
              <span className="font-medium">@{a.actorUsername}</span>{" "}
              {ACTION_LABELS[a.action] ?? a.action}{" "}
              <span className="font-medium">@{a.targetUsername}</span>
            </p>
            {a.reason && <p className="mt-1 text-muted-foreground">Reason: {a.reason}</p>}
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="size-3" /> {formatDate(a.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "unknown date" : date.toLocaleDateString()
}

function ReportCard({
  report,
  busy,
  onSetStatus,
  onBan,
}: {
  report: AdminReport
  busy: boolean
  onSetStatus: (status: Exclude<ReportStatus, "open">) => void
  onBan: () => void
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
          <AlertTriangle className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{report.reason}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Avatar size="sm" className="size-4">
                <AvatarFallback className="bg-muted text-[8px]">
                  {report.reporter.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              Reporter @{report.reporter}
            </span>
            <span>→ Reported @{report.reportedUsername}</span>
            {report.conversationId && <span>Session {report.conversationId.slice(-6)}</span>}
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {formatDate(report.createdAt)}
            </span>
          </div>
          {report.details && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {report.details}
            </p>
          )}
        </div>
      </div>

      {/*
        Only actions with a real backend appear here. The previous version also
        offered Warn and Temp Ban, neither of which was wired to anything, so an
        admin could click them and believe a user had been sanctioned.
      */}
      {report.status === "open" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onSetStatus("reviewed")}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Mark reviewed
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={busy || !report.reportedUserId}
            onClick={onBan}
          >
            <Ban className="size-4" /> Ban user
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onSetStatus("dismissed")}>
            <Check className="size-4" /> Dismiss
          </Button>
        </div>
      )}
    </div>
  )
}

export default function AdminReportsPage() {
  const [reports, setReports] = React.useState<AdminReport[] | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  /** Pure I/O, so calling it from an effect body touches no state. */
  const loadReports = React.useCallback(async (): Promise<AdminReport[]> => {
    const res = await fetch("/api/admin/reports")
    if (!res.ok) throw new Error("Failed to load reports")
    const data = await res.json()
    return Array.isArray(data.reports) ? data.reports : []
  }, [])

  React.useEffect(() => {
    loadReports()
      .then(setReports)
      .catch(() => setFailed(true))
  }, [loadReports])

  async function setStatus(report: AdminReport, status: Exclude<ReportStatus, "open">) {
    setBusyId(report.id)
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        toast.error("Could not update this report")
        return
      }
      setReports((prev) => prev?.map((r) => (r.id === report.id ? { ...r, status } : r)) ?? prev)
      toast.success(`Report marked ${status}`)
    } catch {
      toast.error("Could not update this report")
    } finally {
      setBusyId(null)
    }
  }

  async function banUser(report: AdminReport) {
    if (!report.reportedUserId) return
    if (!confirm(`Permanently ban @${report.reportedUsername}?`)) return

    setBusyId(report.id)
    try {
      const res = await fetch(`/api/admin/users/${report.reportedUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: true, banReason: report.reason }),
      })
      if (!res.ok) {
        toast.error("Could not ban this user")
        return
      }
      // Banning settles the report, so it should leave the open queue with it.
      await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      }).catch(() => {})
      setReports((prev) =>
        prev?.map((r) => (r.id === report.id ? { ...r, status: "resolved" } : r)) ?? prev,
      )
      toast.success(`@${report.reportedUsername} banned`)
    } catch {
      toast.error("Could not ban this user")
    } finally {
      setBusyId(null)
    }
  }

  const openCount = reports?.filter((r) => r.status === "open").length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Reports Queue</h1>
        <p className="mt-1 text-muted-foreground">Review and act on user reports.</p>
      </div>

      {failed && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Could not load reports. Refresh to try again.
        </p>
      )}

      {reports === null && !failed ? (
        <div role="status" aria-label="Loading reports" className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="open">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
                {tab.value === "open" && openCount > 0 ? ` (${openCount})` : ""}
              </TabsTrigger>
            ))}
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>
          {TABS.map((tab) => {
            const items = (reports ?? []).filter((r) => r.status === tab.value)
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-6">
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No {tab.label.toLowerCase()} reports.
                    </p>
                  ) : (
                    items.map((report) => (
                      <ReportCard
                        key={report.id}
                        report={report}
                        busy={busyId === report.id}
                        onSetStatus={(status) => setStatus(report, status)}
                        onBan={() => banUser(report)}
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            )
          })}
          <TabsContent value="audit" className="mt-6">
            <AuditLogTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
