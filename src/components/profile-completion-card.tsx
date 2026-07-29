"use client"

import * as React from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  areRequiredStepsComplete,
  getStepStatus,
  getCompletionPercentage,
  getFirstIncompleteStep,
  STEP_LABELS,
  STEP_ORDER,
  STEP_PATHS,
  type UserProfileData,
} from "@/lib/onboarding-progress"

const STORAGE_KEY = "profileCardCollapsed"

interface ProfileCompletionCardProps {
  user: UserProfileData
}

export function ProfileCompletionCard({ user }: ProfileCompletionCardProps) {
  const percentage = getCompletionPercentage(user)
  const status = getStepStatus(user)
  const firstIncomplete = getFirstIncompleteStep(user)

  /*
   * Only the language step is required, and the app forces it before the
   * dashboard is reachable — so this card almost always describes optional
   * extras. It used to announce "Complete your profile — 20%" the moment a new
   * user finished setup, framing them as 80% failed at something they had in
   * fact completed. Once the required step is done, this speaks about optional
   * additions and counts what is left instead of leading with a low percentage.
   */
  const requiredDone = areRequiredStepsComplete(user)
  const remaining = STEP_ORDER.filter((step) => !status[step]).length
  const heading = requiredDone ? "Get better matches" : "Finish setting up"
  const subheading = requiredDone
    ? `${remaining} optional ${remaining === 1 ? "step" : "steps"} left — add interests, a photo or tutor preferences.`
    : "One quick step and you can start practising."
  const actionLabel = requiredDone ? "Add details" : "Continue setup"
  const continueHref = firstIncomplete
    ? `${STEP_PATHS[firstIncomplete]}?from=dashboard`
    : "/dashboard"

  const [collapsedAtPct, setCollapsedAtPct] = React.useState<number | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      return (JSON.parse(stored) as { pct: number }).pct
    } catch {
      return null
    }
  })

  const collapsed = collapsedAtPct === percentage

  React.useEffect(() => {
    if (collapsedAtPct !== null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pct: collapsedAtPct }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [collapsedAtPct])

  if (percentage >= 100) return null

  if (collapsed) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm">
        <p className="text-sm font-medium">{heading}</p>
        <div className="flex items-center gap-3">
          {!requiredDone && (
            <span className="text-sm font-semibold text-primary">{percentage}%</span>
          )}
          <Link
            href={continueHref}
            className="text-sm text-primary hover:underline"
          >
            Resume
          </Link>
          <button
            type="button"
            onClick={() => setCollapsedAtPct(null)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Expand"
          >
            <span className="text-sm">↓</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{heading}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subheading}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!requiredDone && (
            <span className="text-sm font-semibold text-primary">{percentage}%</span>
          )}
          <button
            type="button"
            onClick={() => setCollapsedAtPct(percentage)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Collapse"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* A progress bar implies a task that must be finished, so it only
          appears while a required step is genuinely outstanding. */}
      {!requiredDone && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Step pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {STEP_ORDER.map((step) => {
          const done = status[step]
          return (
            <span
              key={step}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                done
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {done ? "✓" : "○"} {STEP_LABELS[step]}
            </span>
          )
        })}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <Link
          href={continueHref}
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {actionLabel}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsedAtPct(percentage)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Remind Me Later
        </button>
      </div>
    </div>
  )
}
