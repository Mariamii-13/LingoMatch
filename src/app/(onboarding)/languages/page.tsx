"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LanguageLevelPicker, type LanguageLevelEntry } from "@/components/language-level-picker"
import { LEARNING_LEVELS, getLanguage } from "@/constants/languages"
import {
  getCompletionPercentage,
  type OnboardingStep,
  type UserProfileData,
} from "@/lib/onboarding-progress"
import { useSetupPage } from "@/hooks/use-setup-page"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { OnboardingStepBar } from "@/components/onboarding/OnboardingStepBar"

type LanguageFormProps = {
  user: UserProfileData
  backHref: string
  backLabel: string
  showBack: boolean
  isFirstRun: boolean
  buttonLabel: string
  stepStatus: Record<OnboardingStep, boolean>
  buildRedirect: (savedUser: UserProfileData) => string | null
}

function initialNativeLanguages(user: UserProfileData): LanguageLevelEntry[] {
  if (user.languageProfile) {
    return user.languageProfile.nativeLanguages.map((code) => ({ code, level: "native" }))
  }
  return (user.spokenLanguages ?? []).filter((language) => language.level === "native")
}

function initialLearningLanguages(user: UserProfileData): LanguageLevelEntry[] {
  if (user.languageProfile) {
    return user.languageProfile.learningLanguages.map(({ code, level }) => ({ code, level }))
  }
  return user.learningLanguages ?? []
}

function LanguageProfileForm({
  user,
  backHref,
  backLabel,
  showBack,
  isFirstRun,
  buttonLabel,
  stepStatus,
  buildRedirect,
}: LanguageFormProps) {
  const router = useRouter()
  const [nativeLanguages, setNativeLanguages] = React.useState<LanguageLevelEntry[]>(
    () => initialNativeLanguages(user),
  )
  const [learningLanguages, setLearningLanguages] = React.useState<LanguageLevelEntry[]>(
    () => initialLearningLanguages(user),
  )
  const [explanationLanguage, setExplanationLanguage] = React.useState(
    () => user.languageProfile?.preferredExplanationLanguage ?? initialNativeLanguages(user)[0]?.code ?? "",
  )
  const [saving, setSaving] = React.useState(false)

  const [initialSnapshot, setInitialSnapshot] = React.useState(() => JSON.stringify({
    nativeLanguages: initialNativeLanguages(user),
    learningLanguages: initialLearningLanguages(user),
    explanationLanguage:
      user.languageProfile?.preferredExplanationLanguage ??
      initialNativeLanguages(user)[0]?.code ??
      "",
  }))
  const currentSnapshot = JSON.stringify({
    nativeLanguages,
    learningLanguages,
    explanationLanguage,
  })
  const isDirty = currentSnapshot !== initialSnapshot
  const { confirmNavigation, releaseGuard } = useUnsavedChanges(isDirty)
  const nativeCodes = nativeLanguages.map((language) => language.code)

  function handleNativeLanguagesChange(next: LanguageLevelEntry[]) {
    setNativeLanguages(next)
    setExplanationLanguage((current) =>
      next.some((language) => language.code === current) ? current : (next[0]?.code ?? ""),
    )
  }

  async function handleSave() {
    if (nativeLanguages.length === 0) {
      toast.error("Add at least one native language")
      return
    }
    if (learningLanguages.length === 0) {
      toast.error("Add at least one language you want to learn")
      return
    }
    if (!nativeLanguages.some((language) => language.code === explanationLanguage)) {
      toast.error("Choose an explanation language")
      return
    }

    setSaving(true)
    try {
      const languageProfile = {
        nativeLanguages: nativeCodes,
        learningLanguages: learningLanguages.map((language, index) => ({
          ...language,
          isPrimary: index === 0,
        })),
        preferredExplanationLanguage: explanationLanguage,
      }
      const updatedUser = {
        ...user,
        languageProfile,
        spokenLanguages: nativeLanguages,
        learningLanguages,
      }
      const allDone = getCompletionPercentage(updatedUser) === 100

      const response = await fetch("/api/user/me/language-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(languageProfile),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error ?? "Failed to save language profile")
        return
      }

      if (allDone) {
        const completionResponse = await fetch("/api/user/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onboardingCompleted: true }),
        })
        if (!completionResponse.ok) {
          const data = await completionResponse.json().catch(() => ({}))
          toast.error(data.error ?? "Language profile saved, but onboarding could not be completed")
          return
        }
      }

      setInitialSnapshot(currentSnapshot)
      releaseGuard()

      const redirect = buildRedirect(updatedUser)
      if (!redirect) {
        toast.success("Language profile saved")
      } else if (redirect === "/dashboard") {
        window.location.href = "/dashboard"
      } else {
        router.push(redirect)
      }
    } catch {
      toast.error("Failed to save language profile")
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (confirmNavigation()) router.push(backHref)
  }

  return (
    <div>
      {isFirstRun ? (
        <p className="mb-6 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          One quick step and you can start practising. Everything else is optional and
          can wait.
        </p>
      ) : (
        <OnboardingStepBar currentStep="languages" stepStatus={stepStatus} />
      )}

      {showBack && (
        <button type="button" onClick={handleBack} className="mb-4 text-sm text-primary hover:underline">
          {backLabel}
        </button>
      )}

      <h1 className="text-2xl font-semibold">
        {isFirstRun ? "Which languages are you learning?" : "Your language profile"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us what you speak and what you are learning so lessons can adapt to you.
      </p>

      <div className="mt-8 space-y-8">
        <div className="space-y-3">
          <Label>My native languages</Label>
          <p className="text-xs text-muted-foreground">Add every language you grew up speaking fluently.</p>
          <LanguageLevelPicker
            value={nativeLanguages}
            onChange={handleNativeLanguagesChange}
            levels={["native"]}
            defaultLevel="native"
            placeholder="Add a language…"
          />
        </div>

        <div className="space-y-3">
          <Label>Languages I want to learn</Label>
          <p className="text-xs text-muted-foreground">The first language is your primary learning target.</p>
          <LanguageLevelPicker
            value={learningLanguages}
            onChange={setLearningLanguages}
            levels={LEARNING_LEVELS}
            defaultLevel="unsure"
            excludeCodes={nativeCodes}
            placeholder="Add a language…"
          />
        </div>

        <div className="space-y-3">
          <Label htmlFor="explanation-language">Explain new concepts in</Label>
          <p className="text-xs text-muted-foreground">
            Your tutor uses this language for short grammar explanations when needed.
          </p>
          <select
            id="explanation-language"
            value={explanationLanguage}
            onChange={(event) => setExplanationLanguage(event.target.value)}
            disabled={nativeLanguages.length === 0}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a language</option>
            {nativeLanguages.map(({ code }) => (
              <option key={code} value={code}>{getLanguage(code).name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : buttonLabel}
        </Button>
      </div>
    </div>
  )
}

function OnboardingLanguagesContent() {
  const setup = useSetupPage("languages")
  if (setup.loading || !setup.user) {
    return <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <LanguageProfileForm
      user={setup.user}
      backHref={setup.backHref}
      backLabel={setup.backLabel}
      showBack={setup.showBack}
      isFirstRun={setup.isFirstRun}
      buttonLabel={setup.buttonLabel}
      stepStatus={setup.stepStatus}
      buildRedirect={setup.buildRedirect}
    />
  )
}

export default function OnboardingLanguagesPage() {
  return (
    <React.Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <OnboardingLanguagesContent />
    </React.Suspense>
  )
}
