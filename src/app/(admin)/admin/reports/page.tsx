"use client"

import { AlertTriangle, Ban, Check, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { adminReports } from "@/lib/admin-placeholder-data"

type Status = "pending" | "reviewed" | "dismissed"

function ReportCard({ report }: { report: (typeof adminReports)[number] }) {
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
            <span>→ Reported @{report.reported}</span>
            <span>Session {report.session}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" /> {report.date}
            </span>
          </div>
        </div>
      </div>

      {report.status === "pending" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm">Warn</Button>
          <Button variant="outline" size="sm">Temp Ban</Button>
          <Button variant="destructive" size="sm">
            <Ban className="size-4" /> Perm Ban
          </Button>
          <Button variant="ghost" size="sm">
            <Check className="size-4" /> Dismiss
          </Button>
        </div>
      )}
    </div>
  )
}

function ReportList({ status }: { status: Status }) {
  const items = adminReports.filter((r) => r.status === status)
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No {status} reports.
        </p>
      ) : (
        items.map((r) => <ReportCard key={r.id} report={r} />)
      )}
    </div>
  )
}

export default function AdminReportsPage() {
  const pending = adminReports.filter((r) => r.status === "pending").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Reports Queue</h1>
        <p className="mt-1 text-muted-foreground">
          Review and act on user reports.
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-6">
          <ReportList status="pending" />
        </TabsContent>
        <TabsContent value="reviewed" className="mt-6">
          <ReportList status="reviewed" />
        </TabsContent>
        <TabsContent value="dismissed" className="mt-6">
          <ReportList status="dismissed" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
