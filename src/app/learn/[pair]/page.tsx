import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/shared/brand-mark"
import { JsonLd } from "@/components/shared/json-ld"
import { LEARN_PAIRS, findLearnPair } from "@/lib/learn-pairs"
import { SITE_URL, SITE_NAME } from "@/lib/site"

export function generateStaticParams() {
  return LEARN_PAIRS.map((pair) => ({ pair: pair.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>
}): Promise<Metadata> {
  const { pair: slug } = await params
  const pair = findLearnPair(slug)
  if (!pair) return {}

  const title = `${pair.nativeName} ↔ ${pair.targetName} practice`
  const description = `Practice ${pair.nativeName} and ${pair.targetName} with real conversation partners and an AI tutor that explains in your own language. ${pair.challenge}`

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/learn/${pair.slug}` },
    openGraph: { title, description, url: `${SITE_URL}/learn/${pair.slug}` },
  }
}

export default async function LearnPairPage({
  params,
}: {
  params: Promise<{ pair: string }>
}) {
  const { pair: slug } = await params
  const pair = findLearnPair(slug)
  if (!pair) notFound()

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${pair.nativeName} ↔ ${pair.targetName} practice`,
          description: pair.challenge,
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          url: `${SITE_URL}/learn/${pair.slug}`,
        }}
      />

      <header className="border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <BrandMark href="/" />
          <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
            Get Started
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Link href="/learn" className="text-sm text-muted-foreground hover:text-foreground">
            ← All language pairs
          </Link>

          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            {pair.nativeName} ↔ {pair.targetName}
          </h1>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">Why this pair is hard</h2>
            <p className="mt-3 text-muted-foreground">{pair.challenge}</p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold">How LingoMatch helps</h2>
            <p className="mt-3 text-muted-foreground">{pair.approach}</p>
          </section>

          <div className="mt-12 rounded-2xl border bg-card p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold">
              Practice {pair.nativeName} ↔ {pair.targetName} today
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Match with a real partner, or start with the AI tutor while you wait.
            </p>
            <Button className="mt-6" nativeButton={false} render={<Link href="/register" />}>
              Get Started <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} LingoMatch. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
