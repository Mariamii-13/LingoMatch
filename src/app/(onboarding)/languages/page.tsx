"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Plus, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { languageOptions } from "@/lib/mock-data"

const levels = ["Beginner", "Intermediate", "Advanced"] as const

export default function OnboardingLanguagesPage() {
  const router = useRouter()
  const [native, setNative] = React.useState<string[]>(["ES"])
  const [learning, setLearning] = React.useState<Record<string, string>>({ JA: "Intermediate" })
  const [saving, setSaving] = React.useState(false)

  const toggleNative = (code: string) =>
    setNative((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])

  const toggleLearning = (code: string) =>
    setLearning((prev) => {
      const next = { ...prev }
      if (next[code]) delete next[code]
      else next[code] = "Beginner"
      return next
    })

  async function handleContinue() {
    if (native.length === 0) { toast.error("Select at least one native language"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nativeLanguages: native,
          learningLanguages: Object.entries(learning).map(([code, level]) => ({ code, level })),
        }),
      })
      if (!res.ok) { toast.error("Failed to save"); return }
      router.push("/interests")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Your languages</h1>
      <p className="mt-1 text-sm text-muted-foreground">Pick what you speak and what you want to learn.</p>

      <div className="mt-8 space-y-8">
        <div className="space-y-3">
          <Label>Native language(s)</Label>
          <div className="flex flex-wrap gap-2">
            {languageOptions.map((lang) => (
              <button key={lang.code} type="button" onClick={() => toggleNative(lang.code)}
                className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  native.includes(lang.code) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                )}>
                <span>{lang.flag}</span> {lang.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Learning languages</Label>
          <div className="flex flex-wrap gap-2">
            {languageOptions.filter((l) => !native.includes(l.code)).map((lang) => {
              const selected = !!learning[lang.code]
              return (
                <button key={lang.code} type="button" onClick={() => toggleLearning(lang.code)}
                  className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"
                  )}>
                  {selected ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
                  <span>{lang.flag}</span> {lang.name}
                </button>
              )
            })}
          </div>

          {Object.keys(learning).length > 0 && (
            <div className="mt-4 space-y-3">
              {Object.entries(learning).map(([code, level]) => {
                const lang = languageOptions.find((l) => l.code === code)!
                return (
                  <div key={code} className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-lg">{lang.flag}</span> {lang.name}
                    </span>
                    <select value={level}
                      onChange={(e) => setLearning((prev) => ({ ...prev, [code]: e.target.value }))}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30">
                      {levels.map((lv) => <option key={lv}>{lv}</option>)}
                    </select>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={() => router.push("/ai-preferences")}>Back</Button>
        <Button onClick={handleContinue} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
        </Button>
      </div>
    </div>
  )
}
