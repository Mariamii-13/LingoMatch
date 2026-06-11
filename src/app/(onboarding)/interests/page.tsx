"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { interestCategories } from "@/lib/mock-data"
import { InterestCategoryCard } from "./_components/InterestCategoryCard"
import { SubInterestSheet } from "./_components/SubInterestSheet"

function buildInterestsObj(
  selectedCategories: string[],
  subInterests: Record<string, string[]>
): Record<string, string[]> {
  return Object.fromEntries(
    selectedCategories.map((key) => [key, subInterests[key] ?? []])
  )
}

export default function OnboardingInterestsPage() {
  const router = useRouter()
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
  const [subInterests, setSubInterests] = React.useState<Record<string, string[]>>({})
  const [activeSheet, setActiveSheet] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  function toggleCategory(key: string) {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
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

  function openSheet(key: string) {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev : [...prev, key]
    )
    setActiveSheet(key)
  }

  const activeCategory = interestCategories.find((c) => c.key === activeSheet) ?? null

  async function handleContinue() {
    setSaving(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interests: buildInterestsObj(selectedCategories, subInterests),
        }),
      })
      if (!res.ok) {
        toast.error("Failed to save")
        return
      }
      router.push("/mode")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
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
            subLabels={subInterests[cat.key] ?? []}
            onSelect={() => toggleCategory(cat.key)}
            onOpenSheet={() => openSheet(cat.key)}
          />
        ))}
      </div>

      {activeCategory && (
        <SubInterestSheet
          open={activeSheet !== null}
          category={activeCategory.category}
          emoji={activeCategory.emoji}
          subInterests={activeCategory.subInterests}
          selected={subInterests[activeSheet!] ?? []}
          onToggle={(interest) => toggleSubInterest(activeSheet!, interest)}
          onDone={() => setActiveSheet(null)}
          onSkip={() => setActiveSheet(null)}
        />
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/languages")}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {selectedCategories.length} selected
          </span>
          <Button onClick={handleContinue} disabled={saving || selectedCategories.length === 0}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  )
}
