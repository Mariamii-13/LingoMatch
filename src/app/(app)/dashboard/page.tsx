import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  BarChart3,
  Bot,
  Compass,
  Flame,
  History,
  Inbox,
  MessageSquare,
  Mic,
} from "lucide-react"

import { auth } from "@/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProfileCompletionCard } from "@/components/profile-completion-card"
import { PendingMatchCard } from "@/components/dashboard/pending-match-card"
import { getLanguage } from "@/constants/languages"
import { getUserProfileData, toPlainProfile } from "@/lib/user-profile.server"
import { getProgressSummary } from "@/lib/progress.server"
import { getPendingMatches } from "@/lib/pending-matches.server"
import type { UserProfileData } from "@/lib/onboarding-progress"

const secondaryLinks = [
  {
    title: "Find Partners",
    description: "Browse profiles and connect with people who share your language goals.",
    href: "/explore",
    icon: Compass,
  },
  {
    title: "Conversations",
    description: "Return to your existing conversations.",
    href: "/messages",
    icon: Inbox,
  },
  {
    title: "Progress",
    description: "See your sessions, languages practised and current streak.",
    href: "/progress",
    icon: BarChart3,
  },
]

/*
 * Rendered on the server. This page used to fetch the profile from the browser
 * in an effect, so the greeting, the target language and the setup card all
 * arrived after first paint and shifted the layout as they landed.
 */
export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [rawProfile, summary, pendingMatches] = await Promise.all([
    getUserProfileData(session.user.id),
    getProgressSummary(session.user.id),
    getPendingMatches(session.user.id),
  ])
  const profileData = toPlainProfile(rawProfile) as UserProfileData | null

  const lastPractice = summary.recent[0] ?? null
  const lastPracticeLanguage = lastPractice?.languageCode
    ? getLanguage(lastPractice.languageCode).name
    : null

  const firstName = session.user.name?.split(" ")[0] ?? "there"
  const primaryTarget =
    profileData?.languageProfile?.learningLanguages.find((language) => language.isPrimary) ??
    profileData?.languageProfile?.learningLanguages[0]
  const targetLanguageName = primaryTarget ? getLanguage(primaryTarget.code).name : null

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">Welcome back</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          Ready to practise, {firstName}?
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Choose the kind of language practice that feels right today.
        </p>
      </header>

      <PendingMatchCard matches={pendingMatches} />

      {profileData && <ProfileCompletionCard user={profileData} />}

      <section aria-labelledby="practice-heading">
        <div className="mb-4">
          <h2 id="practice-heading" className="text-lg font-semibold">Start practising</h2>
          <p className="text-sm text-muted-foreground">
            Speaking live is the fastest way to build real confidence — text stays here for
            coordinating, or for whenever voice isn&apos;t the right fit.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-sm lg:col-span-3">
            <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Bot className="size-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold">
                      {targetLanguageName
                        ? `Practise ${targetLanguageName} with your AI tutor`
                        : "Practise with your AI tutor"}
                    </h3>
                    <Badge variant="secondary">Available now</Badge>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Chat any time, at your level. Pick a topic like travel or job interviews and
                    your tutor corrects you as you go — no partner needed, no waiting.
                  </p>
                </div>
              </div>
              <Button size="lg" nativeButton={false} render={<Link href="/ai-practice" />}>
                Start practising <ArrowRight className="size-4" />
              </Button>
            </div>
          </article>

          {/* Voice is the primary human-practice mode (18.5): the largest, most
              prominent card here, with video framed as an in-card upgrade link
              rather than a competing card — see PROJECT_PASSPORT.md §18.5. */}
          <article className="relative flex flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm lg:col-span-2">
            <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="relative flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                <Mic className="size-6" />
              </span>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">Start a voice conversation</h3>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Talk live with a real partner — no camera, nothing to set up. It&apos;s the
                  fastest way to build real speaking confidence, and you can turn your camera on
                  anytime once you&apos;re already talking.
                </p>
              </div>
            </div>
            <div className="relative mt-5 flex flex-wrap items-center gap-4">
              <Button size="lg" nativeButton={false} render={<Link href="/match/voice" />}>
                Find a voice match <ArrowRight className="size-4" />
              </Button>
              <Link
                href="/match/video"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Prefer video from the start? →
              </Link>
            </div>
          </article>

          <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm">
            <span className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <MessageSquare className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">Text Practice</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              Best for coordinating, sharing a note or link, or practising when voice isn&apos;t an
              option right now.
            </p>
            <Button className="mt-5" variant="outline" nativeButton={false} render={<Link href="/match/chat" />}>
              Find a text match
            </Button>
          </article>

          {/* Promised recent practice for as long as this card existed; now that
              sessions are recorded, it can actually show it. */}
          {lastPractice ? (
            <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm lg:col-span-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <History className="size-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">Pick up where you left off</h3>
                    {summary.currentStreak > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Flame className="size-3" />
                        {summary.currentStreak}-day streak
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Last practice: {lastPracticeLanguage ?? "a session"}
                    {lastPractice.kind === "tutor" && lastPractice.mode
                      ? ` · ${lastPractice.mode}`
                      : " · with a partner"}
                    .
                  </p>
                </div>
              </div>
              <Button
                className="mt-4 lg:mt-0"
                variant="outline"
                nativeButton={false}
                render={<Link href="/progress" />}
              >
                View progress
              </Button>
            </article>
          ) : (
            <article className="flex flex-col justify-center rounded-2xl border border-dashed bg-muted/20 p-5 lg:col-span-3">
              <p className="font-medium">Your recent practice will appear here</p>
              <p className="mt-2 text-sm text-muted-foreground">
                There is no recorded practice activity to show yet. Start with any practice mode when you are ready.
              </p>
            </article>
          )}
        </div>
      </section>

      <section aria-labelledby="continue-heading">
        <h2 id="continue-heading" className="text-lg font-semibold">Continue your journey</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {secondaryLinks.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-5 text-primary" />
                  <h3 className="font-semibold">{item.title}</h3>
                  <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
