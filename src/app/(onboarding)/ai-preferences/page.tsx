"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AIPreferencesForm } from "@/components/ai-preferences/AIPreferencesForm"
import { getLanguage } from "@/constants/languages"
import { getCompletionPercentage } from "@/lib/onboarding-progress"
import { useSetupPage } from "@/hooks/use-setup-page"
import { OnboardingStepBar } from "@/components/onboarding/OnboardingStepBar"
import type { AIProfile } from "@/types"

function OnboardingAIPreferencesContent() {
  const router = useRouter()
  const { backHref, showBack, buttonLabel, user, loading, stepStatus, buildRedirect, buildSkipRedirect } =
    useSetupPage("ai-preferences")

  const initialProfile = user?.aiProfile as Partial<AIProfile> | undefined
  const learningLanguages = React.useMemo(
    () => ((user?.learningLanguages ?? []) as { code: string }[]).map((l) => getLanguage(l.code)),
    [user]
  )
  const interestTags = React.useMemo(
    () => Object.values((user?.interests as Record<string, string[]>) ?? {}).flat(),
    [user]
  )

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
    if (!redirect) { toast.success("Saved"); return }
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
      <OnboardingStepBar currentStep="ai-preferences" stepStatus={stepStatus} />

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
          showBack={showBack}
          saveLabel={buttonLabel}
          skipHref={buildSkipRedirect()}
        />
      </div>
    </div>
  )
}

export default function OnboardingAIPreferencesPage() {
  return (
    <React.Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <OnboardingAIPreferencesContent />
    </React.Suspense>
  )
}
