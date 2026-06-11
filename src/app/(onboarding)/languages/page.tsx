"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LanguageLevelPicker, type LanguageLevelEntry } from "@/components/language-level-picker"
import { SPOKEN_LEVELS, LEARNING_LEVELS } from "@/constants/languages"

export default function OnboardingLanguagesPage() {
  const router = useRouter()
  const [spoken, setSpoken] = React.useState<LanguageLevelEntry[]>([])
  const [learning, setLearning] = React.useState<LanguageLevelEntry[]>([])
  const [saving, setSaving] = React.useState(false)

  const spokenCodes = spoken.map((s) => s.code)

  async function handleContinue() {
    if (spoken.length === 0) {
      toast.error("Add at least one language you speak")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spokenLanguages: spoken, learningLanguages: learning }),
      })
      if (!res.ok) { toast.error("Failed to save"); return }
      router.push("/interests")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
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

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={() => router.push("/ai-preferences")}>
          Back
        </Button>
        <Button onClick={handleContinue} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
        </Button>
      </div>
    </div>
  )
}
