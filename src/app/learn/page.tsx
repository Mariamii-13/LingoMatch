import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/shared/brand-mark"
import { LEARN_PAIRS } from "@/lib/learn-pairs"
import { SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  title: "Language pairs",
  description:
    "Practice guides for the language pairs LingoMatch supports well today: real conversation partners, own-language AI tutoring, and optional live voice.",
  alternates: { canonical: `${SITE_URL}/learn` },
}

export default function LearnIndexPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <BrandMark href="/" />
          <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
            Get Started
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-bold sm:text-4xl">Language pairs</h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            LingoMatch pairs an AI tutor that explains mistakes in your own language with real
            conversation partners learning the reverse direction. These are the pairs currently
            supported well, and what makes each one specifically hard.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {LEARN_PAIRS.map((pair) => (
              <Link
                key={pair.slug}
                href={`/learn/${pair.slug}`}
                className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:border-primary/50"
              >
                <h2 className="font-semibold">
                  {pair.nativeName} ↔ {pair.targetName}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {pair.challenge}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Read more <ArrowRight className="size-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} LingoMatch. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
