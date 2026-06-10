"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AIPreferencesForm } from "@/components/ai-preferences/AIPreferencesForm"
import { languageOptions } from "@/lib/mock-data"
import type { AIProfile } from "@/types"

export default function OnboardingAIPreferencesPage() {
  const router = useRouter()
  const [initialProfile, setInitialProfile] = React.useState<Partial<AIProfile>>()
  const [learningLanguages, setLearningLanguages] = React.useState<
    { code: string; name: string; flag: string }[]
  >([])
  const [interestTags, setInterestTags] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((u) => {
        if (u.aiProfile) setInitialProfile(u.aiProfile)
        if (u.learningLanguages?.length) {
          const langs = (u.learningLanguages as { code: string }[])
            .map((l) => languageOptions.find((o) => o.code === l.code))
            .filter(Boolean) as { code: string; name: string; flag: string }[]
          setLearningLanguages(langs)
        }
        if (u.interests) {
          const tags = Object.values(u.interests as Record<string, string[]>).flat()
          setInterestTags(tags)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(profile: AIProfile) {
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiProfile: profile }),
    })
    if (!res.ok) {
      toast.error("Failed to save preferences")
      throw new Error("Save failed")
    }
    router.push("/languages")
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">AI Matching Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Help AI find your ideal conversation partner.
      </p>
      <div className="mt-6">
        <AIPreferencesForm
          initialProfile={initialProfile}
          learningLanguages={learningLanguages}
          interestTags={interestTags}
          mode="onboarding"
          onSave={handleSave}
          backHref="/profile"
        />
      </div>
    </div>
  )
}
