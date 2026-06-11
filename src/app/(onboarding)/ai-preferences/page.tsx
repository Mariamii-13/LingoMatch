"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AIPreferencesForm } from "@/components/ai-preferences/AIPreferencesForm"
import { getLanguage } from "@/constants/languages"
import { getCompletionPercentage } from "@/lib/onboarding-progress"
import { useSetupPage } from "@/hooks/use-setup-page"
import type { AIProfile } from "@/types"

export default function OnboardingAIPreferencesPage() {
  const router = useRouter()
  const { completedCount, backHref, user, loading, buildRedirect } =
    useSetupPage("ai-preferences")

  const [initialProfile, setInitialProfile] = React.useState<Partial<AIProfile>>()
  const [learningLanguages, setLearningLanguages] = React.useState<
    { code: string; name: string; flag: string }[]
  >([])
  const [interestTags, setInterestTags] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!user) return
    if (user.aiProfile) setInitialProfile(user.aiProfile as Partial<AIProfile>)
    if (user.learningLanguages?.length) {
      setLearningLanguages(
        (user.learningLanguages as { code: string }[]).map((l) => getLanguage(l.code))
      )
    }
    if (user.interests) {
      setInterestTags(Object.values(user.interests as Record<string, string[]>).flat())
    }
  }, [user])

  async function handleSave(profile: AIProfile) {
    const updatedUser = { ...(user ?? {}), aiProfile: profile }
    const allDone = getCompletionPercentage(updatedUser) === 100

    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiProfile: profile,
        ...(allDone && { onboardingCompleted: true }),
      }),
    })
    if (!res.ok) {
      toast.error("Failed to save preferences")
      throw new Error("Save failed")
    }

    const redirect = buildRedirect(updatedUser)
    if (!redirect) return
    if (redirect === "/dashboard") {
      window.location.href = "/dashboard"
    } else {
      router.push(redirect)
    }
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
      {/* Status line */}
      <p className="mb-6 text-sm text-muted-foreground">
        {completedCount} of 5 sections completed
      </p>

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
          backHref={backHref}
        />
      </div>
    </div>
  )
}
