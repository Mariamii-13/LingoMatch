"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { interestCategories } from "@/lib/mock-data"
import { InterestCategoryCard } from "./_components/InterestCategoryCard"

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
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

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
        <Button variant="ghost" onClick={() => router.push("/languages")}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {selectedCategories.length} selected
          </span>
          <Button
            onClick={handleContinue}
            disabled={saving || selectedCategories.length === 0}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  )
}
