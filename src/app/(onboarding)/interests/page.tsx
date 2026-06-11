"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { interestCategories } from "@/lib/mock-data"
import { InterestCategoryCard } from "./_components/InterestCategoryCard"
import { getCompletionPercentage } from "@/lib/onboarding-progress"
import { useSetupPage } from "@/hooks/use-setup-page"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

function buildInterestsObj(
  selectedCategories: string[],
  subInterests: Record<string, string[]>
): Record<string, string[]> {
  return Object.fromEntries(
    selectedCategories.map((key) => [key, subInterests[key] ?? []])
  )
}

function OnboardingInterestsContent() {
  const router = useRouter()
  const { completedCount, backHref, backLabel, buttonLabel, user, buildRedirect } =
    useSetupPage("interests")

  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
  const [subInterests, setSubInterests] = React.useState<Record<string, string[]>>({})
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

  const isDirty = selectedCategories.length > 0
  const { confirmNavigation } = useUnsavedChanges(isDirty)

  function selectCategory(key: string) {
    setSelectedCategories((prev) => [...prev, key])
    setExpandedCategories((prev) => [...prev, key])
  }

  function deselectCategory(key: string) {
    setSelectedCategories((prev) => prev.filter((k) => k !== key))
    setExpandedCategories((prev) => prev.filter((k) => k !== key))
  }

  function toggleExpand(key: string) {
    setExpandedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  function toggleSubInterest(key: string, interest: string) {
    setSubInterests((prev) => {
      const current = prev[key] ?? []
      return {
        ...prev,
        [key]: current.includes(interest)
          ? current.filter((i) => i !== interest)
          : [...current, interest],
      }
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const interests = buildInterestsObj(selectedCategories, subInterests)
      const updatedUser = { ...(user ?? {}), interests }
      const allDone = getCompletionPercentage(updatedUser) === 100

      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests,
          ...(allDone && { onboardingCompleted: true }),
        }),
      })
      if (!res.ok) { toast.error("Failed to save"); return }

      const redirect = buildRedirect(updatedUser)
      if (!redirect) { toast.success("Saved"); return }
      if (redirect === "/dashboard") {
        window.location.href = "/dashboard"
      } else {
        router.push(redirect)
      }
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (!confirmNavigation()) return
    router.push(backHref)
  }

  return (
    <div>
      <p className="mb-6 text-sm text-muted-foreground">
        {completedCount} of 5 sections completed
      </p>

      <button
        type="button"
        onClick={handleBack}
        className="mb-4 text-sm text-primary hover:underline"
      >
        {backLabel}
      </button>

      <h1 className="text-2xl font-semibold">What are you into?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap topics you love. Add detail anytime.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-2.5">
        {interestCategories.map((cat) => (
          <InterestCategoryCard
            key={cat.key}
            category={cat.category}
            emoji={cat.emoji}
            selected={selectedCategories.includes(cat.key)}
            expanded={expandedCategories.includes(cat.key)}
            subInterests={cat.subInterests}
            selectedSubs={subInterests[cat.key] ?? []}
            onSelect={() => selectCategory(cat.key)}
            onDeselect={() => deselectCategory(cat.key)}
            onToggleExpand={() => toggleExpand(cat.key)}
            onToggleSub={(interest) => toggleSubInterest(cat.key, interest)}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {selectedCategories.length} selected
        </span>
        <Button onClick={handleSave} disabled={saving || selectedCategories.length === 0}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : buttonLabel}
        </Button>
      </div>
    </div>
  )
}

export default function OnboardingInterestsPage() {
  return (
    <React.Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <OnboardingInterestsContent />
    </React.Suspense>
  )
}
