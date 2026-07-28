// src/hooks/use-setup-page.ts
"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  areRequiredStepsComplete,
  buildSetupRedirect,
  buildSkipTarget,
  getCompletedCount,
  getStepStatus,
  resolveSetupNav,
  STEP_ORDER,
  type OnboardingStep,
  type UserProfileData,
} from "@/lib/onboarding-progress"

interface UseSetupPageResult {
  loading: boolean
  user: UserProfileData | null
  completedCount: number
  currentStepIndex: number
  stepStatus: Record<OnboardingStep, boolean>
  backHref: string
  backLabel: string
  /** False while required setup is unfinished — every back target would bounce straight back here. */
  showBack: boolean
  /** True until the user has finished the required setup. */
  isFirstRun: boolean
  buttonLabel: string
  from: string
  buildRedirect: (savedUser: UserProfileData) => string | null
  buildSkipRedirect: () => string
}

export function useSetupPage(currentStep: OnboardingStep): UseSetupPageResult {
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "dashboard"
  const [loading, setLoading] = React.useState(true)
  const [user, setUser] = React.useState<UserProfileData | null>(null)

  React.useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data: UserProfileData) => setUser(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const completedCount = user ? getCompletedCount(user) : 0
  const currentStepIndex = STEP_ORDER.indexOf(currentStep)
  const stepStatus: Record<OnboardingStep, boolean> = user
    ? getStepStatus(user)
    : { profile: false, "ai-preferences": false, languages: false, interests: false, modes: false }

  const { backHref, backLabel, showBack } = resolveSetupNav(from, user)
  const isFirstRun = user ? !areRequiredStepsComplete(user) : false

  const otherStepsAllDone = user
    ? STEP_ORDER.filter((s) => s !== currentStep).every((s) => stepStatus[s])
    : false
  const buttonLabel = isFirstRun
    ? "Save & Start Practising"
    : otherStepsAllDone
    ? "Save & Return to Dashboard"
    : "Save & Continue"

  function buildRedirect(savedUser: UserProfileData): string | null {
    return buildSetupRedirect({ currentStep, savedUser, wasFirstRun: isFirstRun, from })
  }

  function buildSkipRedirect(): string {
    return buildSkipTarget(currentStep, from)
  }

  return {
    loading,
    user,
    completedCount,
    currentStepIndex,
    stepStatus,
    backHref,
    backLabel,
    showBack,
    isFirstRun,
    buttonLabel,
    from,
    buildRedirect,
    buildSkipRedirect,
  }
}
