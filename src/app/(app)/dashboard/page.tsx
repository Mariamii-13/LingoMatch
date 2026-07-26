"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Bot,
  Compass,
  Inbox,
  MessageSquare,
  Video,
} from "lucide-react"
import { useSession } from "next-auth/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProfileCompletionCard } from "@/components/profile-completion-card"
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
    description: "View your practice activity as it becomes available.",
    href: "/progress",
    icon: BarChart3,
  },
]

export default function DashboardPage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(" ")[0] ?? "there"
  const [profileData, setProfileData] = React.useState<UserProfileData | null>(null)

  React.useEffect(() => {
    fetch("/api/user/me")
      .then((response) => response.json())
      .then((data: UserProfileData) => setProfileData(data))
      .catch(() => {})
  }, [])

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

      {profileData && <ProfileCompletionCard user={profileData} />}

      <section aria-labelledby="practice-heading">
        <div className="mb-4">
          <h2 id="practice-heading" className="text-lg font-semibold">Start practising</h2>
          <p className="text-sm text-muted-foreground">AI, text, and optional live practice are all available from one place.</p>
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
                    <h3 className="text-xl font-semibold">Practice with AI</h3>
                    <Badge variant="secondary">Preview</Badge>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Explore the AI Practice area and see the guided experiences being prepared for LingoMatch.
                  </p>
                </div>
              </div>
              <Button size="lg" render={<Link href="/ai-practice" />}>
                Explore AI Practice <ArrowRight className="size-4" />
              </Button>
            </div>
          </article>

          <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm">
            <span className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <MessageSquare className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">Text Practice</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              Match with a language partner for an instant text conversation.
            </p>
            <Button className="mt-5" variant="outline" render={<Link href="/match/chat" />}>
              Find a text match
            </Button>
          </article>

          <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex size-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
                <Video className="size-5" />
              </span>
              <Badge variant="outline">Optional</Badge>
            </div>
            <h3 className="mt-4 text-lg font-semibold">Live Practice</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              Practise live with a partner when you want to. Camera use is always your choice.
            </p>
            <Button className="mt-5" variant="outline" render={<Link href="/match/video" />}>
              Choose live practice
            </Button>
          </article>

          <article className="flex flex-col justify-center rounded-2xl border border-dashed bg-muted/20 p-5">
            <p className="font-medium">Your recent practice will appear here</p>
            <p className="mt-2 text-sm text-muted-foreground">
              There is no recorded practice activity to show yet. Start with any practice mode when you are ready.
            </p>
          </article>
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
