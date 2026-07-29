import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { BarChart3, Bot, CalendarCheck, Flame, MessageSquare, Users } from "lucide-react"

import { auth } from "@/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FlagImage } from "@/components/shared/flag-image"
import { getLanguage } from "@/constants/languages"
import { getProgressSummary, type RecentPractice } from "@/lib/progress.server"

export const metadata: Metadata = { title: "Progress" }

function relativeDay(iso: string): string {
  const then = new Date(iso)
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  return then.toLocaleDateString()
}

function PracticeRow({ item }: { item: RecentPractice }) {
  const language = item.languageCode ? getLanguage(item.languageCode) : null
  const Icon = item.kind === "tutor" ? Bot : Users

  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          {language && <FlagImage flag={language.flag} />}
          {language?.name ?? "Practice"}
          <Badge variant="outline" className="text-xs font-normal">
            {item.kind === "tutor" ? (item.mode ?? "AI tutor") : "Partner"}
          </Badge>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {relativeDay(item.at)}
          {item.messageCount > 0 &&
            ` · ${item.messageCount} ${item.messageCount === 1 ? "message" : "messages"}`}
        </p>
      </div>
    </li>
  )
}

/*
 * This page used to say progress tracking was not active and list planned
 * metrics. Persisting tutor sessions changed that: every figure below is counted
 * from real records, so the page can finally do its job. Nothing is estimated —
 * anything that cannot be counted is not shown.
 */
export default async function ProgressPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const summary = await getProgressSummary(session.user.id)
  const totalSessions = summary.tutorSessions + summary.partnerConversations
  const totalMessages = summary.tutorMessages + summary.partnerMessages

  if (totalSessions === 0) {
    return (
      <div className="space-y-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold sm:text-3xl">Progress</h1>
          <p className="mt-2 text-muted-foreground">Your practice history will appear here.</p>
        </div>

        <section className="rounded-2xl border bg-card px-6 py-12 text-center shadow-sm">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BarChart3 className="size-7" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Nothing to show yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Practise with your AI tutor or a language partner and this page will start tracking
            your sessions, the languages you are working on, and your streak.
          </p>
          <Button
            className="mt-6"
            size="lg"
            nativeButton={false}
            render={<Link href="/ai-practice" />}
          >
            Start practising
          </Button>
        </section>
      </div>
    )
  }

  const stats = [
    {
      label: "Practice sessions",
      value: totalSessions,
      detail: `${summary.tutorSessions} with your tutor · ${summary.partnerConversations} with partners`,
      icon: MessageSquare,
    },
    {
      label: "Messages",
      value: totalMessages,
      // Spelled out because the two halves count different things: a tutor
      // session stores both sides of the transcript, while partner messages are
      // only the ones this user sent.
      detail: `${summary.tutorMessages} in tutor sessions · ${summary.partnerMessages} sent to partners`,
      icon: Bot,
    },
    {
      label: "Days practised",
      value: summary.daysPractised,
      // Says the window explicitly: the streak only looks back 30 days, so this
      // is not an all-time figure and should not imply one.
      detail: "in the last 30 days",
      icon: CalendarCheck,
    },
    {
      label: "Current streak",
      value: summary.currentStreak,
      detail: summary.currentStreak === 1 ? "day in a row" : "days in a row",
      icon: Flame,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold sm:text-3xl">Progress</h1>
        <p className="mt-2 text-muted-foreground">
          Counted from your actual practice — no estimates.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <Icon className="size-4 shrink-0 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold">{stat.value.toLocaleString()}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{stat.detail}</p>
            </div>
          )
        })}
      </div>

      {summary.languageCodes.length > 0 && (
        <section>
          <h2 className="font-semibold">Languages you have practised</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {summary.languageCodes.map((code) => {
              const language = getLanguage(code)
              return (
                <Badge key={code} variant="secondary">
                  <FlagImage flag={language.flag} /> {language.name}
                </Badge>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent practice</h2>
          <Link href="/ai-practice" className="text-sm text-primary hover:underline">
            Practise again
          </Link>
        </div>
        <ul className="divide-y rounded-xl border bg-card shadow-sm">
          {summary.recent.map((item) => (
            <PracticeRow key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </ul>
      </section>
    </div>
  )
}
