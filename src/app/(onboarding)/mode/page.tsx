"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { conversationModes } from "@/lib/mock-data"
import { getCompletionPercentage } from "@/lib/onboarding-progress"
import { useSetupPage } from "@/hooks/use-setup-page"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

function OnboardingModeContent() {
  const router = useRouter()
  const { completedCount, backHref, backLabel, buttonLabel, user, buildRedirect } =
    useSetupPage("modes")

  const [selected, setSelected] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

  const isDirty = selected.length > 0
  const { confirmNavigation } = useUnsavedChanges(isDirty)

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )

  async function handleSave() {
    if (selected.length === 0) { toast.error("Select at least one mode"); return }
    setSaving(true)
    try {
      const updatedUser = { ...(user ?? {}), conversationModes: selected }
      const allDone = getCompletionPercentage(updatedUser) === 100

      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationModes: selected,
          ...(allDone && { onboardingCompleted: true }),
        }),
      })
      if (!res.ok) { toast.error("Failed to save"); return }

      const redirect = buildRedirect(updatedUser)
      if (!redirect) { toast.success("Saved"); return }
      if (redirect === "/dashboard") {
        window.location.href = "/dashboard"
      } else {
        router.push(redirect)
      }
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (!confirmNavigation()) return
    router.push(backHref)
  }

  return (
    <div>
      <p className="mb-6 text-sm text-muted-foreground">
        {completedCount} of 5 sections completed
      </p>

      <button
        type="button"
        onClick={handleBack}
        className="mb-4 text-sm text-primary hover:underline"
      >
        {backLabel}
      </button>

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

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={saving || selected.length === 0}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : buttonLabel}
        </Button>
      </div>
    </div>
  )
}

export default function OnboardingModePage() {
  return (
    <React.Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <OnboardingModeContent />
    </React.Suspense>
  )
}
