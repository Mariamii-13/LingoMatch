"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar, MessageSquare, Sparkles, Users, Video } from "lucide-react"
import { useSession } from "next-auth/react"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  dashboardStats,
  friendActivity,
  scheduledSessions,
} from "@/lib/mock-data"
import { ProfileCompletionCard } from "@/components/profile-completion-card"
import type { UserProfileData } from "@/lib/onboarding-progress"

const aiInsight = {
  week: "Week of Jun 2",
  language: "Spanish focus",
  speakingHours: "3.2h",
  sessions: 4,
  growthPct: "+18%",
  fluencyPct: 67,
  tip: "Focus on pronunciation in Spanish conditional tense. Try 3 sessions this week.",
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(" ")[0] ?? "there"

  const [profileData, setProfileData] = React.useState<UserProfileData | null>(null)

  React.useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data: UserProfileData) => setProfileData(data))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          🌤️ Good morning, {firstName}
        </h1>
      </div>

      {/* Profile completion card */}
      {profileData && <ProfileCompletionCard user={profileData} />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold">{dashboardStats.sessionsToday}</p>
          <p className="mt-1 text-xs text-muted-foreground">Sessions</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold">{dashboardStats.friends}</p>
          <p className="mt-1 text-xs text-muted-foreground">Friends</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold">🔥 {dashboardStats.streak}</p>
          <p className="mt-1 text-xs text-muted-foreground">Streak</p>
        </div>
      </div>

      {/* Match CTAs */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Start a conversation</p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/match/chat"
            className="flex flex-col items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-5 text-white transition-colors hover:bg-blue-700"
          >
            <MessageSquare className="size-6" />
            <span className="text-sm font-semibold">Chat Match</span>
            <span className="text-xs opacity-75">Text · Instant</span>
          </Link>
          <Link
            href="/match/video"
            className="flex flex-col items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-5 text-white transition-colors hover:bg-violet-700"
          >
            <Video className="size-6" />
            <span className="text-sm font-semibold">Video Match</span>
            <span className="text-xs opacity-75">Video · Voice · Chat</span>
          </Link>
        </div>
      </div>

      {/* AI Weekly Insight — promoted to main column */}
      <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">AI Weekly Insight</p>
            <p className="text-xs text-muted-foreground">
              {aiInsight.week} · {aiInsight.language}
            </p>
          </div>
        </div>

        {/* Stat mini-cards */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/60 p-3 text-center">
            <p className="text-lg font-bold">{aiInsight.speakingHours}</p>
            <p className="text-[11px] text-muted-foreground">Speaking</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3 text-center">
            <p className="text-lg font-bold">{aiInsight.sessions}</p>
            <p className="text-[11px] text-muted-foreground">Sessions</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{aiInsight.growthPct}</p>
            <p className="text-[11px] text-muted-foreground">vs last wk</p>
          </div>
        </div>

        {/* Fluency progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Fluency progress</span>
            <span className="font-semibold">{aiInsight.fluencyPct}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${aiInsight.fluencyPct}%` }}
            />
          </div>
        </div>

        {/* Tip */}
        <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-sm">
          💡 <span className="font-medium">Tip:</span>{" "}
          <span className="text-muted-foreground">{aiInsight.tip}</span>
        </div>
      </div>

      {/* Bottom grid: sessions + activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming sessions */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <Calendar className="size-4 text-primary" /> Upcoming Sessions
            </h3>
            <Link href="/schedule" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {scheduledSessions.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <Avatar>
                  <AvatarFallback className={`bg-gradient-to-br ${s.partner.avatarColor} text-white`}>
                    {s.partner.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.partner.name} {s.partner.flag}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.date} · {s.time} {s.timezone}
                  </p>
                </div>
                <Badge variant="secondary">{s.mode}</Badge>
              </div>
            ))}
          </div>
        </section>

        {/* Friend activity */}
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <Users className="size-4 text-primary" /> Friend Activity
          </h3>
          <div className="mt-4 space-y-4">
            {friendActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <Avatar size="sm">
                  <AvatarFallback className={`bg-gradient-to-br ${a.color} text-white text-xs`}>
                    {a.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-sm">
                  <p>
                    <span className="font-medium">{a.name}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
