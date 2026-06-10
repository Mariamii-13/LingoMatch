"use client"

import * as React from "react"
import Link from "next/link"
import { Check, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { conversationModes } from "@/lib/mock-data"

export default function OnboardingModePage() {
  const [selected, setSelected] = React.useState<string[]>(["friendly", "casual"])
  const [saving, setSaving] = React.useState(false)

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )

  async function handleFinish() {
    setSaving(true)
    try {
      await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationModes: selected,
          onboardingCompleted: true,
        }),
      })
    } catch {
      // best-effort; proceed regardless
    }
    // Hard navigation forces JWT refresh so proxy sees onboardingCompleted=true
    window.location.href = "/dashboard"
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Pick your modes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose the conversation styles you&apos;re open to. You can change these anytime.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {conversationModes.map((mode) => {
          const active = selected.includes(mode.id)
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => toggle(mode.id)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              )}
            >
              {active && (
                <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
              )}
              <div className="text-2xl">{mode.emoji}</div>
              <h3 className="mt-2 font-semibold">{mode.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{mode.description}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" render={<Link href="/interests" />}>Back</Button>
        <Button onClick={handleFinish} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Finish setup"}
        </Button>
      </div>
    </div>
  )
}
