"use client"

import * as React from "react"
import Link from "next/link"
import { Lock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"

export default function OnboardingAIPreferencesPage() {
  const [personality, setPersonality] = React.useState("")
  const [comfort, setComfort] = React.useState(6)
  const [anxiety, setAnxiety] = React.useState(4)
  const [avoid, setAvoid] = React.useState("")
  const [pace, setPace] = React.useState("Medium")
  const [style, setStyle] = React.useState<"Formal" | "Casual">("Casual")

  return (
    <div>
      <div className="flex items-center gap-2">
        <Lock className="size-5 text-primary" />
        <h1 className="text-2xl font-semibold">Tell us privately what you prefer</h1>
      </div>
      <p className="mt-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
        Only AI sees this — never other users.
      </p>

      <div className="mt-8 space-y-7">
        <div className="space-y-2">
          <Label htmlFor="personality">What kind of partner do you enjoy?</Label>
          <Textarea
            id="personality"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="e.g. patient, funny, asks lots of questions, doesn't mind silences..."
            rows={3}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Comfort level speaking</Label>
            <span className="text-sm font-medium text-primary">{comfort}/10</span>
          </div>
          <Slider
            value={[comfort]}
            min={1}
            max={10}
            step={1}
            onValueChange={(v) => setComfort((Array.isArray(v) ? v[0] : v) as number)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Nervous</span>
            <span>Very confident</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Social anxiety level</Label>
            <span className="text-sm font-medium text-primary">{anxiety}/10</span>
          </div>
          <Slider
            value={[anxiety]}
            min={1}
            max={10}
            step={1}
            onValueChange={(v) => setAnxiety((Array.isArray(v) ? v[0] : v) as number)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Relaxed</span>
            <span>Very anxious</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="avoid">Topics to avoid</Label>
          <Input
            id="avoid"
            value={avoid}
            onChange={(e) => setAvoid(e.target.value)}
            placeholder="e.g. politics, religion..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pace">Conversation pace</Label>
          <select
            id="pace"
            value={pace}
            onChange={(e) => setPace(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option>Slow</option>
            <option>Medium</option>
            <option>Fast</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Communication style</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["Formal", "Casual"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStyle(opt)}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                  style === opt
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" render={<Link href="/profile" />}>Back</Button>
        <Button render={<Link href="/languages" />}>Continue</Button>
      </div>
    </div>
  )
}
