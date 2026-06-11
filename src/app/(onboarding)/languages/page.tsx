"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LanguageLevelPicker, type LanguageLevelEntry } from "@/components/language-level-picker"
import { SPOKEN_LEVELS, LEARNING_LEVELS } from "@/constants/languages"
import { getCompletionPercentage } from "@/lib/onboarding-progress"
import { useSetupPage } from "@/hooks/use-setup-page"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

function OnboardingLanguagesContent() {
  const router = useRouter()
  const { completedCount, backHref, backLabel, buttonLabel, user, buildRedirect } =
    useSetupPage("languages")

  const [spoken, setSpoken] = React.useState<LanguageLevelEntry[]>([])
  const [learning, setLearning] = React.useState<LanguageLevelEntry[]>([])
  const [saving, setSaving] = React.useState(false)

  const isDirty = spoken.length > 0 || learning.length > 0
  const { confirmNavigation } = useUnsavedChanges(isDirty)
  const spokenCodes = spoken.map((s) => s.code)

  async function handleSave() {
    if (spoken.length === 0) {
      toast.error("Add at least one language you speak")
      return
    }
    if (learning.length === 0) {
      toast.error("Add at least one language you want to learn")
      return
    }
    setSaving(true)
    try {
      const updatedUser = { ...(user ?? {}), spokenLanguages: spoken, learningLanguages: learning }
      const allDone = getCompletionPercentage(updatedUser) === 100

      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spokenLanguages: spoken,
          learningLanguages: learning,
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

      <h1 className="text-2xl font-semibold">Your languages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Add the languages you speak and the ones you want to learn.
      </p>

      <div className="mt-8 space-y-8">
        <div className="space-y-3">
          <Label>Languages I speak</Label>
          <p className="text-xs text-muted-foreground">
            Include your native language and any others you speak well.
          </p>
          <LanguageLevelPicker
            value={spoken}
            onChange={setSpoken}
            levels={SPOKEN_LEVELS}
            defaultLevel="native"
            placeholder="Add a language…"
          />
        </div>

        <div className="space-y-3">
          <Label>Languages I want to learn</Label>
          <p className="text-xs text-muted-foreground">
            Add languages you are currently learning or plan to learn.
          </p>
          <LanguageLevelPicker
            value={learning}
            onChange={setLearning}
            levels={LEARNING_LEVELS}
            defaultLevel="beginner"
            excludeCodes={spokenCodes}
            placeholder="Add a language…"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : buttonLabel}
        </Button>
      </div>
    </div>
  )
}

export default function OnboardingLanguagesPage() {
  return (
    <React.Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <OnboardingLanguagesContent />
    </React.Suspense>
  )
}
