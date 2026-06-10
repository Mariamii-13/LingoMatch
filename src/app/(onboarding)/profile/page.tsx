"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Camera, CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CountrySelector } from "@/components/country-selector"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DobPicker } from "@/components/dob-picker"
import { cn } from "@/lib/utils"

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other / Prefer not to say" },
] as const

type Gender = (typeof GENDER_OPTIONS)[number]["value"] | ""

function calcAge(dob: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

export default function OnboardingProfilePage() {
  const router = useRouter()
  const [name, setName] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [country, setCountry] = React.useState("")
  const [gender, setGender] = React.useState<Gender>("")
  const [dob, setDob] = React.useState<Date | undefined>()
  const [bio, setBio] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const today = new Date()
  const minDob = new Date(today.getFullYear() - 100, 0, 1)
  const endOfCurrentYear = new Date(today.getFullYear(), 11, 31)

  async function handleContinue() {
    if (!name.trim()) { toast.error("Display name required"); return }
    let age: number | undefined
    if (dob) {
      age = calcAge(dob)
      if (age < 13) {
        toast.error("You must be at least 13 years old to register")
        return
      }
    }
    setSaving(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          ...(username.trim() && { username: username.trim() }),
          ...(country && { country }),
          ...(gender && { gender }),
          ...(age !== undefined && { age }),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to save")
        return
      }
      router.push("/ai-preferences")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This is what other speakers will see.
      </p>

      <div className="mt-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            className="group relative flex size-24 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted transition-colors hover:border-primary"
          >
            <Camera className="size-7 text-muted-foreground group-hover:text-primary" />
          </button>
          <span className="text-xs text-muted-foreground">Upload a photo</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="flex items-center rounded-lg border border-input pl-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="text-sm text-muted-foreground">@</span>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alexr"
              className="border-0 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Country</Label>
          <CountrySelector value={country} onChange={setCountry} placeholder="Select your country" />
        </div>

        <div className="space-y-2">
          <Label>Gender</Label>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(gender === opt.value ? "" : opt.value)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-150",
                  gender === opt.value
                    ? "border-purple-500 bg-purple-600 text-white shadow-sm shadow-purple-900/40"
                    : "border-border bg-muted text-muted-foreground hover:border-purple-400 hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Popover>
            <PopoverTrigger
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg border border-input bg-background px-3 py-2 text-sm",
                "transition-colors hover:bg-accent/20",
                "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                !dob && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              <span>{dob ? format(dob, "MMMM d, yyyy") : "Pick your date of birth"}</span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <DobPicker
                selected={dob}
                onSelect={setDob}
                startMonth={minDob}
                endMonth={endOfCurrentYear}
                defaultMonth={today}
                disabled={(date) => date > today}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">You must be at least 13 years old to register.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people a little about yourself..." rows={4} />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleContinue} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
        </Button>
      </div>
    </div>
  )
}
