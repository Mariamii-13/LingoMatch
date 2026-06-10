"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { interestCategories } from "@/lib/mock-data"

function buildInterestsObj(selectedTags: string[]) {
  const obj: Record<string, string[]> = {}
  for (const cat of interestCategories) {
    const key = cat.category.toLowerCase()
    const tags = cat.tags.filter((t) => selectedTags.includes(t))
    if (tags.length > 0) obj[key] = tags
  }
  return obj
}

export default function OnboardingInterestsPage() {
  const router = useRouter()
  const [selected, setSelected] = React.useState<string[]>(["RPG", "Coffee", "Photography"])
  const [saving, setSaving] = React.useState(false)

  const toggle = (tag: string) =>
    setSelected((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  async function handleContinue() {
    setSaving(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: buildInterestsObj(selected) }),
      })
      if (!res.ok) { toast.error("Failed to save"); return }
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
        Pick a few interests so we can match you with people you&apos;ll click with.
      </p>

      <div className="mt-8 space-y-6">
        {interestCategories.map((cat) => (
          <div key={cat.category}>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{cat.category}</h3>
            <div className="flex flex-wrap gap-2">
              {cat.tags.map((tag) => (
                <button key={tag} type="button" onClick={() => toggle(tag)}
                  className={cn("rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    selected.includes(tag) ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent"
                  )}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/languages")}>Back</Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{selected.length} selected</span>
          <Button onClick={handleContinue} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  )
}
