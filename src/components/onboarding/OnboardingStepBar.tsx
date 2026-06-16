"use client"

import { cn } from "@/lib/utils"
import { STEP_ORDER, STEP_LABELS, type OnboardingStep } from "@/lib/onboarding-progress"

interface OnboardingStepBarProps {
  currentStep: OnboardingStep
  stepStatus: Record<OnboardingStep, boolean>
}

export function OnboardingStepBar({ currentStep, stepStatus }: OnboardingStepBarProps) {
  const completedCount = Object.values(stepStatus).filter(Boolean).length

  return (
    <div className="mb-6 space-y-2.5">
      <p className="text-sm text-muted-foreground">
        {completedCount} of 5 sections completed
      </p>
      <div className="flex items-end gap-1.5">
        {STEP_ORDER.map((step) => {
          const isCurrent = step === currentStep
          const isDone = stepStatus[step]
          return (
            <div key={step} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "h-1.5 w-full rounded-full transition-colors duration-200",
                  isDone
                    ? "bg-primary"
                    : isCurrent
                    ? "bg-primary/50"
                    : "bg-muted"
                )}
              />
              <span
                className={cn(
                  "truncate text-[10px] leading-tight",
                  isCurrent
                    ? "font-semibold text-primary"
                    : isDone
                    ? "text-muted-foreground"
                    : "text-muted-foreground/40"
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
