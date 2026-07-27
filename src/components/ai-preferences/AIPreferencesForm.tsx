"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Languages, Sparkles, Loader2, RotateCcw, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import type { AIProfile, ConversationGoal, MatchingPriority, PreferredTrait, TopicToAvoid } from "@/types"

const CONVERSATION_GOALS: ConversationGoal[] = [
  "Language Practice",
  "New Friends",
  "Cultural Exchange",
  "Daily Conversations",
  "Deep Discussions",
  "Casual Chat",
  "Flirty Vibe",
  "Anything",
]

const MATCHING_PRIORITIES: MatchingPriority[] = [
  "Same language goals",
  "Same interests",
  "Similar personality",
  "Similar communication style",
  "Similar age",
  "Surprise me",
]

const PREFERRED_TRAITS: PreferredTrait[] = [
  "Patient",
  "Funny",
  "Curious",
  "Supportive",
  "Talkative",
  "Good Listener",
  "Calm",
  "Open-minded",
]

const TOPICS_TO_AVOID: TopicToAvoid[] = [
  "No Preference",
  "Politics",
  "Religion",
  "Dating",
  "Personal Finance",
  "Mental Health",
  "Family Topics",
  "Other",
]

export const DEFAULT_AI_PROFILE: AIProfile = {
  conversationGoals: [],
  matchingPriority: "",
  socialEnergy: 5,
  comfortLevel: 6,
  socialAnxietyLevel: 4,
  pace: "Medium",
  style: "Casual",
  preferredTraits: [],
  personalityNotes: "",
  topicsToAvoid: [],
  aiConversationStarters: true,
}

interface LearningLang {
  code: string
  name: string
  flag: string
}

interface AIPreferencesFormProps {
  initialProfile?: Partial<AIProfile>
  learningLanguages?: LearningLang[]
  interestTags?: string[]
  mode: "onboarding" | "settings"
  onSave: (profile: AIProfile) => Promise<void>
  onReset?: () => Promise<void>
  onDelete?: () => Promise<void>
  backHref?: string
  skipHref?: string
}

export function AIPreferencesForm({
  initialProfile,
  learningLanguages = [],
  interestTags = [],
  mode,
  onSave,
  onReset,
  onDelete,
  backHref = "/profile",
  skipHref = "/dashboard",
}: AIPreferencesFormProps) {
  const router = useRouter()
  const [profile, setProfile] = React.useState<AIProfile>({
    ...DEFAULT_AI_PROFILE,
    ...initialProfile,
  })
  const [saving, setSaving] = React.useState(false)
  const [resetting, setResetting] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const initializedRef = React.useRef(false)

  React.useEffect(() => {
    if (initialProfile && !initializedRef.current) {
      initializedRef.current = true
      setProfile({ ...DEFAULT_AI_PROFILE, ...initialProfile })
    }
  }, [initialProfile])

  function toggleArray<T extends string>(key: "conversationGoals" | "preferredTraits", value: T) {
    setProfile((prev) => {
      const arr = prev[key] as T[]
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }

  function toggleTopic(value: TopicToAvoid) {
    setProfile((prev) => {
      if (value === "No Preference") {
        return {
          ...prev,
          topicsToAvoid: prev.topicsToAvoid.includes("No Preference") ? [] : ["No Preference"],
        }
      }
      const without = prev.topicsToAvoid.filter((t) => t !== "No Preference")
      return {
        ...prev,
        topicsToAvoid: without.includes(value)
          ? without.filter((t) => t !== value)
          : [...without, value],
      }
    })
  }

  function setSlider(key: "socialEnergy" | "comfortLevel" | "socialAnxietyLevel", v: number | number[] | readonly number[]) {
    setProfile((prev) => ({ ...prev, [key]: Array.isArray(v) ? v[0] : v }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(profile)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!onReset) return
    setResetting(true)
    try {
      await onReset()
      setProfile(DEFAULT_AI_PROFILE)
      initializedRef.current = false
    } finally {
      setResetting(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
      setProfile(DEFAULT_AI_PROFILE)
      initializedRef.current = false
    } finally {
      setDeleting(false)
    }
  }

  const hasNoPreference = profile.topicsToAvoid.includes("No Preference")
  const busy = saving || resetting || deleting

  return (
    <div className="space-y-6">
      {/* Card 1 — Your Matching Profile (read-only summary) */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Languages className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Your Matching Profile</h2>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Languages you&apos;re learning</p>
            {learningLanguages.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {learningLanguages.map((lang) => (
                  <span
                    key={lang.code}
                    className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
                  >
                    <span>{lang.flag}</span>
                    {lang.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                You&apos;ll select languages in the next step — they&apos;ll be used for AI matching automatically.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Your interests</p>
            {interestTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {interestTags.slice(0, 14).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                You&apos;ll select interests in a later step — they&apos;ll be used for AI matching automatically.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card 2 — Conversation Style */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Conversation Style</h2>
        </div>

        {/* Goals */}
        <div className="space-y-2">
          <Label>
            What are you looking for?{" "}
            <span className="font-normal text-muted-foreground">(select all that apply)</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {CONVERSATION_GOALS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => toggleArray("conversationGoals", goal)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  profile.conversationGoals.includes(goal)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        {/* Social Energy */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Social energy</Label>
            <span className="text-sm font-medium text-primary">{profile.socialEnergy}/10</span>
          </div>
          <Slider
            value={[profile.socialEnergy]}
            min={1}
            max={10}
            step={1}
            onValueChange={(v) => setSlider("socialEnergy", v)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Introvert</span>
            <span>Extrovert</span>
          </div>
        </div>

        {/* Comfort */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Comfort level speaking</Label>
            <span className="text-sm font-medium text-primary">{profile.comfortLevel}/10</span>
          </div>
          <Slider
            value={[profile.comfortLevel]}
            min={1}
            max={10}
            step={1}
            onValueChange={(v) => setSlider("comfortLevel", v)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Nervous</span>
            <span>Very confident</span>
          </div>
        </div>

        {/* Anxiety */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Social anxiety</Label>
            <span className="text-sm font-medium text-primary">{profile.socialAnxietyLevel}/10</span>
          </div>
          <Slider
            value={[profile.socialAnxietyLevel]}
            min={1}
            max={10}
            step={1}
            onValueChange={(v) => setSlider("socialAnxietyLevel", v)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Relaxed</span>
            <span>Very anxious</span>
          </div>
        </div>

        {/* Pace */}
        <div className="space-y-2">
          <Label>Conversation pace</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["Slow", "Medium", "Fast"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setProfile((p) => ({ ...p, pace: opt }))}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                  profile.pace === opt
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div className="space-y-2">
          <Label>Communication style</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["Formal", "Casual"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setProfile((p) => ({ ...p, style: opt }))}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                  profile.style === opt
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Partner Traits */}
        <div className="space-y-3">
          <Label>Partner I enjoy talking to</Label>
          <div className="flex flex-wrap gap-2">
            {PREFERRED_TRAITS.map((trait) => (
              <button
                key={trait}
                type="button"
                onClick={() => toggleArray("preferredTraits", trait)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  profile.preferredTraits.includes(trait)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {trait}
              </button>
            ))}
          </div>
          <Textarea
            value={profile.personalityNotes}
            onChange={(e) => setProfile((p) => ({ ...p, personalityNotes: e.target.value }))}
            placeholder="Additional notes (optional) — e.g. patient, funny, curious, supportive, enjoys deep conversations, doesn't mind pauses, likes asking questions..."
            rows={3}
          />
        </div>
      </div>

      {/* Card 3 — AI Preferences */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">AI Preferences</h2>
        </div>

        {/* Matching Priority */}
        <div className="space-y-2">
          <Label>What matters most when finding a partner?</Label>
          <div className="flex flex-wrap gap-2">
            {MATCHING_PRIORITIES.map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    matchingPriority: p.matchingPriority === priority ? "" : priority,
                  }))
                }
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                  profile.matchingPriority === priority
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>

        {/* Topics to Avoid */}
        <div className="space-y-2">
          <Label>Topics to avoid</Label>
          <div className="flex flex-wrap gap-2">
            {TOPICS_TO_AVOID.map((topic) => {
              const disabled = topic !== "No Preference" && hasNoPreference
              const selected = profile.topicsToAvoid.includes(topic)
              return (
                <button
                  key={topic}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleTopic(topic)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    disabled && "cursor-not-allowed opacity-40",
                    !disabled && selected && "border-primary bg-primary/10 text-primary",
                    !disabled && !selected && "border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  {topic}
                </button>
              )
            })}
          </div>
        </div>

        {/* AI Conversation Starters */}
        <div className="space-y-2">
          <Label>AI-generated conversation starters</Label>
          <p className="text-xs text-muted-foreground">
            After a match, AI can suggest icebreakers to get you started.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([true, false] as const).map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setProfile((p) => ({ ...p, aiConversationStarters: val }))}
                className={cn(
                  "rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                  profile.aiConversationStarters === val
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {val ? "Yes, suggest starters" : "No thanks"}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="flex gap-2.5 rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <p>
            This information is never shown to other users. AI uses it only to improve compatibility
            and matching quality. You can update or delete these preferences at any time.
          </p>
        </div>
      </div>

      {/* Actions */}
      {mode === "onboarding" ? (
        <div className="flex items-center justify-between">
          <Button variant="ghost" nativeButton={false} render={<Link href={backHref} />}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push(skipHref)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
            <Button onClick={handleSave} disabled={busy}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save & Continue"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {onReset && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={busy}
              >
                {resetting ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="mr-1.5 size-3.5" />
                )}
                Reset to defaults
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={busy}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 size-3.5" />
                )}
                Delete data
              </Button>
            )}
          </div>
          <Button onClick={handleSave} disabled={busy}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
