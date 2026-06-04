"use client"

import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  Flame,
  Mic,
  Sparkles,
  Users,
} from "lucide-react"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  dashboardStats,
  friendActivity,
  scheduledSessions,
} from "@/lib/mock-data"

const statCards = [
  { label: "Sessions Today", value: dashboardStats.sessionsToday, icon: Mic },
  { label: "Friends", value: dashboardStats.friends, icon: Users },
  { label: "Day Streak", value: `${dashboardStats.streak} 🔥`, icon: Flame },
]

export default function DashboardPage() {
  const { data: session } = useSession()
  const firstName = (session?.user?.name ?? "there").split(" ")[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Good morning, {firstName} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Ready for your next conversation?
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold">{s.value}</p>
            </div>
          )
        })}
      </div>

      {/* Find a conversation CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-fuchsia-600 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/15 blur-2xl" />
        <h2 className="relative text-xl font-bold sm:text-2xl">Find a Conversation</h2>
        <p className="relative mt-1 max-w-md text-white/90">
          Jump into a live voice chat with a partner matched just for you.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="relative mt-5 h-12 px-6 text-base"
          render={<Link href="/match" />}
        >
          <Mic className="size-5" /> Find a Conversation
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scheduled */}
        <div className="lg:col-span-2 space-y-6">
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

        {/* AI Weekly Insight */}
        <aside className="space-y-6">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </span>
              <h3 className="font-semibold">AI Weekly Insight</h3>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              You spoke <span className="font-medium text-foreground">2h 14m</span> this
              week across <span className="font-medium text-foreground">8 sessions</span> —
              up 18% from last week. Your Japanese fluency is trending up. 🎉
            </p>
            <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium">Tip for this week</p>
              <p className="mt-1 text-muted-foreground">
                Try a Deep Conversation in French to push past beginner phrases.
              </p>
            </div>
            <Button variant="outline" className="mt-4 w-full" render={<Link href="/match" />}>
              Start practicing <ArrowRight className="size-4" />
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
