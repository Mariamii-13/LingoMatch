// src/hooks/use-setup-page.ts
"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  getCompletedCount,
  getFirstIncompleteStep,
  getStepStatus,
  STEP_ORDER,
  STEP_PATHS,
  type OnboardingStep,
  type UserProfileData,
} from "@/lib/onboarding-progress"

interface UseSetupPageResult {
  loading: boolean
  user: UserProfileData | null
  completedCount: number
  backHref: string
  backLabel: string
  buttonLabel: string
  from: string
  buildRedirect: (savedUser: UserProfileData) => string | null
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
  const backHref = from === "settings" ? "/settings" : "/dashboard"
  const backLabel = from === "settings" ? "← Settings" : "← Dashboard"

  const otherStepsAllDone = user
    ? STEP_ORDER.filter((s) => s !== currentStep).every(
        (s) => getStepStatus(user)[s]
      )
    : false
  const buttonLabel = otherStepsAllDone
    ? "Save & Return to Dashboard"
    : "Save & Continue"

  function buildRedirect(savedUser: UserProfileData): string | null {
    const next = getFirstIncompleteStep(savedUser)
    if (!next) return "/dashboard"
    if (next === currentStep) return null
    return `${STEP_PATHS[next]}?from=${from}`
  }

  return {
    loading,
    user,
    completedCount,
    backHref,
    backLabel,
    buttonLabel,
    from,
    buildRedirect,
  }
}
