"use client"

import * as React from "react"
import Link from "next/link"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
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
  const continueHref = firstIncomplete
    ? `${STEP_PATHS[firstIncomplete]}?from=dashboard`
    : "/dashboard"

  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return false
      const { pct } = JSON.parse(stored) as { pct: number }
      return pct === percentage
    } catch {
      return false
    }
  })

  React.useEffect(() => {
    if (collapsed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pct: percentage }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [collapsed, percentage])

  React.useEffect(() => {
    if (!collapsed) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && (JSON.parse(stored) as { pct: number }).pct !== percentage) {
        setCollapsed(false)
      }
    } catch {
      setCollapsed(false)
    }
  }, [percentage, collapsed])

  if (percentage >= 100) return null

  if (collapsed) {
    return (
      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm">
        <p className="text-sm font-medium">Complete your profile</p>
        <div className="flex items-center gap-3">
          <span className="text-sm text-primary font-semibold">{percentage}%</span>
          <Link
            href={continueHref}
            className="text-sm text-primary hover:underline"
          >
            Resume
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
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
          <p className="font-semibold">Complete your profile</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Improve matching quality and recommendations
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-semibold text-primary">{percentage}%</span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Collapse"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

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
          Continue Setup
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Remind Me Later
        </button>
      </div>
    </div>
  )
}
