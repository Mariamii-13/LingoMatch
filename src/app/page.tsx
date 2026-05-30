import Link from "next/link"
import {
  ArrowRight,
  Bot,
  Globe,
  Heart,
  Lock,
  type LucideIcon,
  MessageCircle,
  Mic,
  Sparkles,
  Star,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { PricingToggle } from "@/components/landing/pricing-toggle"
import { conversationModes, testimonials } from "@/lib/mock-data"

const steps: { title: string; desc: string; icon: LucideIcon }[] = [
  { title: "Set your vibe", desc: "Pick a mode and the language you want to practice.", icon: Sparkles },
  { title: "AI finds your match", desc: "We pair you with someone who fits your level and energy.", icon: Bot },
  { title: "Talk it out", desc: "Jump into a live voice call with prompts to guide you.", icon: Mic },
  { title: "Grow & connect", desc: "Add friends, build streaks, and watch your fluency soar.", icon: Users },
]

const features: { title: string; desc: string; icon: LucideIcon }[] = [
  { title: "Voice-First", desc: "No typing. Real conversations build real fluency, fast.", icon: Mic },
  { title: "AI Matching", desc: "Smart pairing by level, interests, comfort and energy.", icon: Bot },
  { title: "Private Preferences", desc: "Tell AI what you need — only it sees your private notes.", icon: Lock },
  { title: "7 Modes", desc: "From casual chats to deep talks and cultural exchange.", icon: Sparkles },
  { title: "Friend System", desc: "Turn great matches into lasting language partners.", icon: Users },
  { title: "Language Coaching", desc: "Weekly AI insights on your progress and what to work on.", icon: Star },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mic className="size-4" />
            </span>
            <span className="text-lg font-semibold">SpeakFirst</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <a href="#modes" className="hover:text-foreground">Community</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" render={<Link href="/login" />}>Login</Button>
            <Button render={<Link href="/register" />}>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-20 top-10 size-72 animate-pulse rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -right-20 top-40 size-80 animate-pulse rounded-full bg-fuchsia-500/20 blur-3xl [animation-delay:1s]" />
          <div className="absolute bottom-0 left-1/2 size-72 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 md:py-28 lg:px-8">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Sparkles className="size-3" /> Voice-first language learning
          </Badge>
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Speak Any Language.{" "}
            <span className="gradient-text">Connect Anywhere.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Practice with real people through voice conversations. AI matches you
            with your perfect partner.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="h-12 px-6 text-base" render={<Link href="/register" />}>
              Start Free — No Credit Card
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-6 text-base" render={<a href="#how" />}>
              See How It Works
            </Button>
          </div>

          {/* Globe visual */}
          <div className="relative mx-auto mt-16 flex h-48 max-w-md items-center justify-center">
            <div className="absolute size-40 animate-ping rounded-full border border-primary/30 [animation-duration:3s]" />
            <div className="absolute size-56 rounded-full border border-primary/10" />
            <div className="flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-5xl shadow-2xl">
              🌍
            </div>
            {["🇪🇸", "🇯🇵", "🇧🇷", "🇫🇷"].map((flag, i) => (
              <span
                key={flag}
                className="absolute flex size-10 items-center justify-center rounded-full border bg-card text-xl shadow-md"
                style={{
                  transform: `rotate(${i * 90}deg) translateX(110px) rotate(-${i * 90}deg)`,
                }}
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-6 text-center text-sm font-medium text-muted-foreground sm:px-6 lg:px-8">
          <span>50,000+ speakers</span>
          <span className="text-primary">·</span>
          <span>120 countries</span>
          <span className="text-primary">·</span>
          <span>40 languages</span>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">How it works</h2>
            <p className="mt-4 text-muted-foreground">
              From sign-up to your first real conversation in under a minute.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.title} className="rounded-xl border bg-card p-6 shadow-sm">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-primary">Step {i + 1}</div>
                  <h3 className="mt-1 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/30 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Built for real conversations</h2>
            <p className="mt-4 text-muted-foreground">
              Everything is designed to get you speaking with confidence.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-accent">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Conversation modes */}
      <section id="modes" className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">7 ways to connect</h2>
            <p className="mt-4 text-muted-foreground">
              Pick the energy that fits your mood. Every mode, every day.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {conversationModes.map((mode) => (
              <div key={mode.id} className="rounded-xl border bg-card p-5 shadow-sm transition-colors hover:bg-accent">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{mode.emoji}</span>
                  <h3 className="font-semibold">{mode.name}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{mode.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI + Privacy */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Lock className="size-3" /> Privacy-first AI
            </Badge>
            <h2 className="text-3xl font-bold sm:text-4xl">
              AI that understands you, not just your language
            </h2>
            <p className="mt-4 text-muted-foreground">
              Shy? Prefer slow conversations? Want to avoid certain topics? Tell
              our AI privately. It uses that to find your perfect match — and
              <span className="font-medium text-foreground"> never shares it with other users.</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Your private preferences stay private — always",
                "Matched on comfort level and social energy",
                "No public personality scores or labels",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Lock className="size-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bot className="size-5" />
              </span>
              <div>
                <p className="font-semibold">AI Match Insight</p>
                <p className="text-xs text-muted-foreground">Private to you</p>
              </div>
            </div>
            <div className="mt-6 space-y-4 text-sm">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-muted-foreground">You prefer</p>
                <p className="font-medium">Calm, patient partners · slow pace</p>
              </div>
              <div className="rounded-lg bg-muted p-3">
                <p className="text-muted-foreground">We found</p>
                <p className="font-medium">3 great matches near your level 🎯</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Simple, fair pricing</h2>
            <p className="mt-4 text-muted-foreground">
              Start free. Upgrade when you are ready to go unlimited.
            </p>
          </div>
          <PricingToggle />
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Loved by speakers worldwide</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="flex flex-col rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 flex-1 text-sm">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className={`bg-gradient-to-br ${t.color} text-white`}>
                      {t.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {t.name} <span>{t.flag}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-fuchsia-600 px-6 py-16 text-center text-white shadow-xl">
            <div className="pointer-events-none absolute inset-0 opacity-20">
              <div className="absolute -left-10 -top-10 size-48 rounded-full bg-white/30 blur-2xl" />
              <div className="absolute -bottom-10 -right-10 size-48 rounded-full bg-white/20 blur-2xl" />
            </div>
            <h2 className="relative text-3xl font-bold sm:text-4xl">
              Your next conversation is 30 seconds away
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-white/90">
              Join thousands of speakers practicing right now. It is free to start.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="relative mt-8 h-12 px-6 text-base"
              render={<Link href="/register" />}
            >
              Start Speaking Free <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Mic className="size-4" />
                </span>
                <span className="text-lg font-semibold">SpeakFirst</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                Speak any language. Connect anywhere. Voice-first language learning.
              </p>
              <div className="mt-4 flex gap-3 text-muted-foreground">
                <a href="#" aria-label="Community"><MessageCircle className="size-5 hover:text-foreground" /></a>
                <a href="#" aria-label="Global"><Globe className="size-5 hover:text-foreground" /></a>
                <a href="#" aria-label="Love"><Heart className="size-5 hover:text-foreground" /></a>
              </div>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Modes", "Download"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
              { title: "Legal", links: ["Privacy", "Terms", "Safety", "Contact"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold">{col.title}</h4>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {col.links.map((l) => (
                    <li key={l}><a href="#" className="hover:text-foreground">{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} SpeakFirst. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
