import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Bot,
  Compass,
  MessageSquare,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { BrandMark } from "@/components/shared/brand-mark"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
}

const features: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "AI-guided practice",
    description: "Explore the AI Practice preview as guided conversation, grammar, writing, and assessment experiences are developed.",
    icon: Bot,
  },
  {
    title: "Text practice",
    description: "Match with another learner and practise through a real-time text conversation.",
    icon: MessageSquare,
  },
  {
    title: "Optional live practice",
    description: "Practise live when you choose. Video is an option, never a requirement.",
    icon: Video,
  },
  {
    title: "Find language partners",
    description: "Discover people by language, interests, and the kind of practice you want.",
    icon: Compass,
  },
  {
    title: "Track practice activity",
    description: "A dedicated Progress area will bring your completed practice activity together.",
    icon: BarChart3,
  },
]

const modes = [
  {
    title: "Practice with AI",
    description: "A growing space for guided, independent language practice.",
    label: "Preview",
    icon: Bot,
  },
  {
    title: "Text Practice",
    description: "Connect with a real partner and practise through messages.",
    label: "Partner practice",
    icon: MessageSquare,
  },
  {
    title: "Live Practice",
    description: "Talk with a real partner when live conversation suits you.",
    label: "Optional",
    icon: Video,
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <BrandMark href="/" />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#modes" className="hover:text-foreground">Practice Modes</a>
            <Link href="/learn" className="hover:text-foreground">Language Pairs</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>Login</Button>
            <Button nativeButton={false} render={<Link href="/register" />}>Get Started</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-20 top-10 size-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -right-20 top-40 size-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
          </div>
          <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 md:py-28 lg:px-8">
            <Badge variant="secondary" className="mb-6 gap-1.5">
              <Sparkles className="size-3" /> AI practice and real human connection
            </Badge>
            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Practise your way. <span className="gradient-text">Build real confidence.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              LingoMatch brings AI-guided practice, text conversations, and optional live practice with language partners into one place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="h-12 px-6 text-base" nativeButton={false} render={<Link href="/register" />}>
                Get Started <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-6 text-base" nativeButton={false} render={<a href="#modes" />}>
                Explore Practice Modes
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="border-y bg-muted/30 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">A focused place to practise</h2>
              <p className="mt-4 text-muted-foreground">Choose independent practice or connect with people, without being pushed into video.</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <article key={feature.title} className="rounded-xl border bg-card p-6 shadow-sm">
                    <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section id="modes" className="py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">Ways to practise</h2>
              <p className="mt-4 text-muted-foreground">Start with the format that matches your goals and comfort level today.</p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {modes.map((mode, index) => {
                const Icon = mode.icon
                return (
                  <article key={mode.title} className={index === 0 ? "rounded-2xl border border-primary/30 bg-primary/5 p-6 shadow-sm" : "rounded-2xl border bg-card p-6 shadow-sm"}>
                    <div className="flex items-center justify-between">
                      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-6" />
                      </span>
                      <Badge variant={index === 0 ? "secondary" : "outline"}>{mode.label}</Badge>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold">{mode.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{mode.description}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-muted/30 py-16 md:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Badge variant="outline">Preview</Badge>
            <h2 className="mt-4 text-3xl font-bold">Free during preview</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              LingoMatch is currently available for preview. Paid plans and subscription benefits are not being offered at this stage.
            </p>
            <Button className="mt-8" size="lg" nativeButton={false} render={<Link href="/register" />}>
              Create your account
            </Button>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-primary to-fuchsia-600 px-6 py-14 text-center text-white shadow-xl">
              <h2 className="text-3xl font-bold sm:text-4xl">Make practice fit your day</h2>
              <p className="mx-auto mt-4 max-w-xl text-white/90">
                Practise independently, exchange messages, or choose an optional live conversation when you are ready.
              </p>
              <Button size="lg" variant="secondary" className="mt-8" nativeButton={false} render={<Link href="/register" />}>
                Get Started <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <BrandMark href="/" />
            <p className="mt-3 text-sm text-muted-foreground">AI-guided and partner-based language practice.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#modes" className="hover:text-foreground">Practice Modes</a>
            <Link href="/learn" className="hover:text-foreground">Language Pairs</Link>
            <Link href="/login" className="hover:text-foreground">Login</Link>
            <Link href="/register" className="hover:text-foreground">Get Started</Link>
          </nav>
        </div>
        <div className="border-t px-4 py-5 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} LingoMatch. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
