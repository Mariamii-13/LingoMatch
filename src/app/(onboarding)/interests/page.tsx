"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { interestCategories } from "@/lib/mock-data"

export default function OnboardingInterestsPage() {
  const [selected, setSelected] = React.useState<string[]>([
    "RPG",
    "Coffee",
    "Photography",
  ])

  const toggle = (tag: string) =>
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )

  return (
    <div>
      <h1 className="text-2xl font-semibold">What are you into?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick a few interests so we can match you with people you&apos;ll click with.
      </p>

      <div className="mt-8 space-y-6">
        {interestCategories.map((cat) => (
          <div key={cat.category}>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              {cat.category}
            </h3>
            <div className="flex flex-wrap gap-2">
              {cat.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    selected.includes(tag)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" render={<Link href="/languages" />}>Back</Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{selected.length} selected</span>
          <Button render={<Link href="/mode" />}>Continue</Button>
        </div>
      </div>
    </div>
  )
}
