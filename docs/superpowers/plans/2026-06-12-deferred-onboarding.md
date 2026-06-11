# Deferred Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the forced onboarding gate so users land on `/dashboard` immediately after signup, then encourage profile completion via a dashboard card and a settings entry.

**Architecture:** Delete the middleware redirect block in `src/proxy.ts`. Add a pure utility `src/lib/onboarding-progress.ts` that derives per-step completion from existing user fields. Build a `ProfileCompletionCard` component for the dashboard, strip the wizard chrome from the onboarding layout, and update each step page to show a status line, dynamic back link, and smart save-and-redirect logic.

**Tech Stack:** Next.js App Router (client components), NextAuth sessions, React hooks, Tailwind CSS, `lucide-react`, existing `/api/user/me` PATCH endpoint.

**No test framework is configured.** Verification steps use `npx tsc --noEmit` (type check) and `npm run lint` instead of automated tests.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/onboarding-progress.ts` | Step completion logic, all pure functions |
| Create | `src/hooks/use-setup-page.ts` | Shared hook: fetch user, back link, button label, redirect helper |
| Create | `src/hooks/use-unsaved-changes.ts` | `beforeunload` guard + confirm helper |
| Create | `src/components/profile-completion-card.tsx` | Dashboard completion card |
| Modify | `src/proxy.ts` | Remove onboarding gate (lines 24–28) |
| Modify | `src/app/(onboarding)/layout.tsx` | Strip wizard chrome |
| Modify | `src/app/(onboarding)/profile/page.tsx` | Status line, back link, dynamic button, post-save redirect |
| Modify | `src/app/(onboarding)/ai-preferences/page.tsx` | Same, plus dynamic backHref to AIPreferencesForm |
| Modify | `src/app/(onboarding)/languages/page.tsx` | Same |
| Modify | `src/app/(onboarding)/interests/page.tsx` | Same |
| Modify | `src/app/(onboarding)/mode/page.tsx` | Same, remove hard `window.location.href` |
| Modify | `src/app/(app)/dashboard/page.tsx` | Mount `ProfileCompletionCard` |
| Modify | `src/app/(app)/settings/page.tsx` | Add "Complete Profile / Profile Setup" tab entry |

---

## Task 1: Completion Utility

**Files:**
- Create: `src/lib/onboarding-progress.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/onboarding-progress.ts
import type { AIProfile } from "@/types"

export interface UserProfileData {
  displayName?: string
  username?: string
  country?: string
  spokenLanguages?: { code: string; level: string }[]
  learningLanguages?: { code: string; level: string }[]
  interests?: Record<string, string[]>
  aiProfile?: Partial<AIProfile>
  conversationModes?: string[]
}

export type OnboardingStep =
  | "profile"
  | "ai-preferences"
  | "languages"
  | "interests"
  | "modes"

export const STEP_ORDER: OnboardingStep[] = [
  "profile",
  "ai-preferences",
  "languages",
  "interests",
  "modes",
]

export const STEP_PATHS: Record<OnboardingStep, string> = {
  "profile": "/profile",
  "ai-preferences": "/ai-preferences",
  "languages": "/languages",
  "interests": "/interests",
  "modes": "/mode",
}

export const STEP_LABELS: Record<OnboardingStep, string> = {
  "profile": "Profile",
  "ai-preferences": "AI Preferences",
  "languages": "Languages",
  "interests": "Interests",
  "modes": "Modes",
}

export function getStepStatus(
  user: UserProfileData
): Record<OnboardingStep, boolean> {
  const interests = user.interests ?? {}
  const hasAnyInterest = Object.values(interests).some((arr) => arr.length > 0)

  const ai = user.aiProfile ?? {}
  const hasAIPrefs =
    (ai.conversationGoals?.length ?? 0) > 0 ||
    (ai.preferredTraits?.length ?? 0) > 0 ||
    !!(ai.personalityNotes?.trim()) ||
    (ai.topicsToAvoid?.length ?? 0) > 0

  return {
    profile:
      !!(
        user.displayName?.trim() &&
        user.username?.trim() &&
        user.country?.trim()
      ),
    "ai-preferences": hasAIPrefs,
    languages:
      (user.spokenLanguages?.length ?? 0) > 0 &&
      (user.learningLanguages?.length ?? 0) > 0,
    interests: hasAnyInterest,
    modes: (user.conversationModes?.length ?? 0) > 0,
  }
}

export function getFirstIncompleteStep(
  user: UserProfileData
): OnboardingStep | null {
  const status = getStepStatus(user)
  return STEP_ORDER.find((s) => !status[s]) ?? null
}

export function getCompletedCount(user: UserProfileData): number {
  return Object.values(getStepStatus(user)).filter(Boolean).length
}

export function getCompletionPercentage(user: UserProfileData): number {
  return Math.round((getCompletedCount(user) / STEP_ORDER.length) * 100)
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors related to `src/lib/onboarding-progress.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/onboarding-progress.ts
git commit -m "feat: add onboarding-progress completion utility"
```

---

## Task 2: Shared Setup Page Hooks

**Files:**
- Create: `src/hooks/use-setup-page.ts`
- Create: `src/hooks/use-unsaved-changes.ts`

- [ ] **Step 1: Create `use-unsaved-changes.ts`**

```ts
// src/hooks/use-unsaved-changes.ts
"use client"

import * as React from "react"

export function useUnsavedChanges(isDirty: boolean) {
  React.useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  function confirmNavigation(): boolean {
    if (!isDirty) return true
    return window.confirm("You have unsaved changes. Leave anyway?")
  }

  return { confirmNavigation }
}
```

- [ ] **Step 2: Create `use-setup-page.ts`**

```ts
// src/hooks/use-setup-page.ts
"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  getCompletedCount,
  getCompletionPercentage,
  getFirstIncompleteStep,
  getStepStatus,
  STEP_ORDER,
  STEP_PATHS,
  type OnboardingStep,
  type UserProfileData,
} from "@/lib/onboarding-progress"

interface UseSetupPageResult {
  loading: boolean
  user: UserProfileData | null
  completedCount: number
  backHref: string
  backLabel: string
  buttonLabel: string
  from: string
  buildRedirect: (savedUser: UserProfileData) => string | null
}

export function useSetupPage(currentStep: OnboardingStep): UseSetupPageResult {
  const searchParams = useSearchParams()
  const from = searchParams.get("from") ?? "dashboard"
  const [loading, setLoading] = React.useState(true)
  const [user, setUser] = React.useState<UserProfileData | null>(null)

  React.useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data: UserProfileData) => setUser(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const completedCount = user ? getCompletedCount(user) : 0
  const backHref = from === "settings" ? "/settings" : "/dashboard"
  const backLabel = from === "settings" ? "← Settings" : "← Dashboard"

  const otherStepsAllDone = user
    ? STEP_ORDER.filter((s) => s !== currentStep).every(
        (s) => getStepStatus(user)[s]
      )
    : false
  const buttonLabel = otherStepsAllDone
    ? "Save & Return to Dashboard"
    : "Save & Continue"

  function buildRedirect(savedUser: UserProfileData): string | null {
    const next = getFirstIncompleteStep(savedUser)
    if (!next) return "/dashboard"
    if (next === currentStep) return null
    return `${STEP_PATHS[next]}?from=${from}`
  }

  return {
    loading,
    user,
    completedCount,
    backHref,
    backLabel,
    buttonLabel,
    from,
    buildRedirect,
  }
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors in the new hook files.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-setup-page.ts src/hooks/use-unsaved-changes.ts
git commit -m "feat: add useSetupPage and useUnsavedChanges hooks"
```

---

## Task 3: Remove Middleware Gate

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Delete the onboarding gate block**

Open `src/proxy.ts`. Delete lines 24–28 (the four-line block that reads `onboardingCompleted` and redirects to `/profile`). The final file should be:

```ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const role = (req.auth?.user as { role?: string })?.role

  const publicPaths = ['/', '/login', '/register', '/verify-email', '/forgot-password']
  const isPublic = publicPaths.includes(pathname) || pathname.startsWith('/api/auth')

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
```

- [ ] **Step 2: Type-check and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: remove onboarding gate from middleware"
```

---

## Task 4: Strip Onboarding Layout

**Files:**
- Modify: `src/app/(onboarding)/layout.tsx`

- [ ] **Step 1: Replace the layout**

The step counter, step dots, and progress bar are all removed. Keep only the logo header and the `<main>` wrapper:

```tsx
// src/app/(onboarding)/layout.tsx
"use client"

import Link from "next/link"
import { Mic } from "lucide-react"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mic className="size-4" />
            </span>
            <span className="font-semibold">LingoMatch</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(onboarding)/layout.tsx
git commit -m "feat: strip wizard chrome from onboarding layout"
```

---

## Task 5: Profile Page

**Files:**
- Modify: `src/app/(onboarding)/profile/page.tsx`

- [ ] **Step 1: Rewrite the page**

```tsx
// src/app/(onboarding)/profile/page.tsx
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
import { useSetupPage } from "@/hooks/use-setup-page"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { getCompletionPercentage } from "@/lib/onboarding-progress"

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
  const { completedCount, backHref, backLabel, buttonLabel, user, buildRedirect, from } =
    useSetupPage("profile")

  const [name, setName] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [country, setCountry] = React.useState("")
  const [gender, setGender] = React.useState<Gender>("")
  const [dob, setDob] = React.useState<Date | undefined>()
  const [bio, setBio] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const isDirty = !!(name || username || country || gender || dob || bio)
  const { confirmNavigation } = useUnsavedChanges(isDirty)

  const today = new Date()
  const minDob = new Date(today.getFullYear() - 100, 0, 1)
  const endOfCurrentYear = new Date(today.getFullYear(), 11, 31)

  async function handleSave() {
    if (!name.trim()) { toast.error("Display name required"); return }
    let age: number | undefined
    if (dob) {
      age = calcAge(dob)
      if (age < 13) { toast.error("You must be at least 13 years old"); return }
    }
    setSaving(true)
    try {
      const updatedUser = {
        ...(user ?? {}),
        displayName: name.trim(),
        ...(username.trim() && { username: username.trim() }),
        ...(country && { country }),
      }
      const allDone = getCompletionPercentage(updatedUser) === 100

      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          ...(username.trim() && { username: username.trim() }),
          ...(country && { country }),
          ...(gender && { gender }),
          ...(age !== undefined && { age }),
          ...(bio.trim() && { bio: bio.trim() }),
          ...(allDone && { onboardingCompleted: true }),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Failed to save")
        return
      }

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
      {/* Status line */}
      <p className="mb-6 text-sm text-muted-foreground">
        {completedCount} of 5 sections completed
      </p>

      {/* Back link */}
      <button
        type="button"
        onClick={handleBack}
        className="mb-4 text-sm text-primary hover:underline"
      >
        {backLabel}
      </button>

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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : buttonLabel}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(onboarding)/profile/page.tsx
git commit -m "feat: update profile onboarding page for deferred flow"
```

---

## Task 6: AI Preferences Page

**Files:**
- Modify: `src/app/(onboarding)/ai-preferences/page.tsx`

> **Note:** `AIPreferencesForm` owns its own back button as a `<Link>` internally. `useUnsavedChanges` is not applied here because we cannot intercept that link click without modifying the form (out of scope). The `window.beforeunload` handler is the only unsaved-change guard for this page; it fires on browser tab close/refresh but not on SPA back-link clicks.

- [ ] **Step 1: Rewrite the page**

The `AIPreferencesForm` handles its own back button via `backHref` prop and its own save button. Update `backHref` to be dynamic (from `useSetupPage`), and update the `onSave` callback to use `buildRedirect`.

```tsx
// src/app/(onboarding)/ai-preferences/page.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AIPreferencesForm } from "@/components/ai-preferences/AIPreferencesForm"
import { getLanguage } from "@/constants/languages"
import { getCompletionPercentage } from "@/lib/onboarding-progress"
import { useSetupPage } from "@/hooks/use-setup-page"
import type { AIProfile } from "@/types"

export default function OnboardingAIPreferencesPage() {
  const router = useRouter()
  const { completedCount, backHref, user, loading, buildRedirect } =
    useSetupPage("ai-preferences")

  const [initialProfile, setInitialProfile] = React.useState<Partial<AIProfile>>()
  const [learningLanguages, setLearningLanguages] = React.useState<
    { code: string; name: string; flag: string }[]
  >([])
  const [interestTags, setInterestTags] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!user) return
    if (user.aiProfile) setInitialProfile(user.aiProfile as Partial<AIProfile>)
    if (user.learningLanguages?.length) {
      setLearningLanguages(
        (user.learningLanguages as { code: string }[]).map((l) => getLanguage(l.code))
      )
    }
    if (user.interests) {
      setInterestTags(Object.values(user.interests as Record<string, string[]>).flat())
    }
  }, [user])

  async function handleSave(profile: AIProfile) {
    const updatedUser = { ...(user ?? {}), aiProfile: profile }
    const allDone = getCompletionPercentage(updatedUser) === 100

    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiProfile: profile,
        ...(allDone && { onboardingCompleted: true }),
      }),
    })
    if (!res.ok) {
      toast.error("Failed to save preferences")
      throw new Error("Save failed")
    }

    const redirect = buildRedirect(updatedUser)
    if (!redirect) return
    if (redirect === "/dashboard") {
      window.location.href = "/dashboard"
    } else {
      router.push(redirect)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      {/* Status line */}
      <p className="mb-6 text-sm text-muted-foreground">
        {completedCount} of 5 sections completed
      </p>

      <h1 className="text-2xl font-semibold">AI Matching Profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Help AI find your ideal conversation partner.
      </p>
      <div className="mt-6">
        <AIPreferencesForm
          initialProfile={initialProfile}
          learningLanguages={learningLanguages}
          interestTags={interestTags}
          mode="onboarding"
          onSave={handleSave}
          backHref={backHref}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(onboarding)/ai-preferences/page.tsx
git commit -m "feat: update ai-preferences page for deferred flow"
```

---

## Task 7: Languages Page

**Files:**
- Modify: `src/app/(onboarding)/languages/page.tsx`

- [ ] **Step 1: Rewrite the page**

```tsx
// src/app/(onboarding)/languages/page.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { LanguageLevelPicker, type LanguageLevelEntry } from "@/components/language-level-picker"
import { SPOKEN_LEVELS, LEARNING_LEVELS } from "@/constants/languages"
import { getCompletionPercentage } from "@/lib/onboarding-progress"
import { useSetupPage } from "@/hooks/use-setup-page"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

export default function OnboardingLanguagesPage() {
  const router = useRouter()
  const { completedCount, backHref, backLabel, buttonLabel, user, buildRedirect } =
    useSetupPage("languages")

  const [spoken, setSpoken] = React.useState<LanguageLevelEntry[]>([])
  const [learning, setLearning] = React.useState<LanguageLevelEntry[]>([])
  const [saving, setSaving] = React.useState(false)

  const isDirty = spoken.length > 0 || learning.length > 0
  const { confirmNavigation } = useUnsavedChanges(isDirty)
  const spokenCodes = spoken.map((s) => s.code)

  async function handleSave() {
    if (spoken.length === 0) {
      toast.error("Add at least one language you speak")
      return
    }
    if (learning.length === 0) {
      toast.error("Add at least one language you want to learn")
      return
    }
    setSaving(true)
    try {
      const updatedUser = { ...(user ?? {}), spokenLanguages: spoken, learningLanguages: learning }
      const allDone = getCompletionPercentage(updatedUser) === 100

      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spokenLanguages: spoken,
          learningLanguages: learning,
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

      <h1 className="text-2xl font-semibold">Your languages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Add the languages you speak and the ones you want to learn.
      </p>

      <div className="mt-8 space-y-8">
        <div className="space-y-3">
          <Label>Languages I speak</Label>
          <p className="text-xs text-muted-foreground">
            Include your native language and any others you speak well.
          </p>
          <LanguageLevelPicker
            value={spoken}
            onChange={setSpoken}
            levels={SPOKEN_LEVELS}
            defaultLevel="native"
            placeholder="Add a language…"
          />
        </div>

        <div className="space-y-3">
          <Label>Languages I want to learn</Label>
          <p className="text-xs text-muted-foreground">
            Add languages you are currently learning or plan to learn.
          </p>
          <LanguageLevelPicker
            value={learning}
            onChange={setLearning}
            levels={LEARNING_LEVELS}
            defaultLevel="beginner"
            excludeCodes={spokenCodes}
            placeholder="Add a language…"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : buttonLabel}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(onboarding)/languages/page.tsx
git commit -m "feat: update languages page for deferred flow"
```

---

## Task 8: Interests Page

**Files:**
- Modify: `src/app/(onboarding)/interests/page.tsx`

- [ ] **Step 1: Rewrite the page**

```tsx
// src/app/(onboarding)/interests/page.tsx
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

export default function OnboardingInterestsPage() {
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(onboarding)/interests/page.tsx
git commit -m "feat: update interests page for deferred flow"
```

---

## Task 9: Mode Page

**Files:**
- Modify: `src/app/(onboarding)/mode/page.tsx`

- [ ] **Step 1: Rewrite the page**

Remove the hard `window.location.href` and hardcoded `onboardingCompleted: true`. Use the shared hooks for redirect logic.

```tsx
// src/app/(onboarding)/mode/page.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { conversationModes } from "@/lib/mock-data"
import { getCompletionPercentage } from "@/lib/onboarding-progress"
import { useSetupPage } from "@/hooks/use-setup-page"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

export default function OnboardingModePage() {
  const router = useRouter()
  const { completedCount, backHref, backLabel, buttonLabel, user, buildRedirect } =
    useSetupPage("modes")

  const [selected, setSelected] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

  const isDirty = selected.length > 0
  const { confirmNavigation } = useUnsavedChanges(isDirty)

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )

  async function handleSave() {
    if (selected.length === 0) { toast.error("Select at least one mode"); return }
    setSaving(true)
    try {
      const updatedUser = { ...(user ?? {}), conversationModes: selected }
      const allDone = getCompletionPercentage(updatedUser) === 100

      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationModes: selected,
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

      <h1 className="text-2xl font-semibold">Pick your modes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose the conversation styles you&apos;re open to. You can change these anytime.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {conversationModes.map((mode) => {
          const active = selected.includes(mode.id)
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => toggle(mode.id)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              )}
            >
              {active && (
                <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
              )}
              <div className="text-2xl">{mode.emoji}</div>
              <h3 className="mt-2 font-semibold">{mode.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{mode.description}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSave} disabled={saving || selected.length === 0}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : buttonLabel}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(onboarding)/mode/page.tsx
git commit -m "feat: update mode page for deferred flow"
```

---

## Task 10: ProfileCompletionCard Component

**Files:**
- Create: `src/components/profile-completion-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/profile-completion-card.tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/profile-completion-card.tsx
git commit -m "feat: add ProfileCompletionCard component"
```

---

## Task 11: Dashboard Integration

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add the card**

The card needs user profile data from `/api/user/me`. Add a state + effect to fetch it, then render `<ProfileCompletionCard>` above the stats grid.

```tsx
// src/app/(app)/dashboard/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar, MessageSquare, Sparkles, Users, Video } from "lucide-react"
import { useSession } from "next-auth/react"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ProfileCompletionCard } from "@/components/profile-completion-card"
import {
  dashboardStats,
  friendActivity,
  scheduledSessions,
} from "@/lib/mock-data"
import type { UserProfileData } from "@/lib/onboarding-progress"

const aiInsight = {
  week: "Week of Jun 2",
  language: "Spanish focus",
  speakingHours: "3.2h",
  sessions: 4,
  growthPct: "+18%",
  fluencyPct: 67,
  tip: "Focus on pronunciation in Spanish conditional tense. Try 3 sessions this week.",
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(" ")[0] ?? "there"
  const [profileData, setProfileData] = React.useState<UserProfileData | null>(null)

  React.useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((data: UserProfileData) => setProfileData(data))
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          🌤️ Good morning, {firstName}
        </h1>
      </div>

      {/* Profile completion card */}
      {profileData && <ProfileCompletionCard user={profileData} />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold">{dashboardStats.sessionsToday}</p>
          <p className="mt-1 text-xs text-muted-foreground">Sessions</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold">{dashboardStats.friends}</p>
          <p className="mt-1 text-xs text-muted-foreground">Friends</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold">🔥 {dashboardStats.streak}</p>
          <p className="mt-1 text-xs text-muted-foreground">Streak</p>
        </div>
      </div>

      {/* Match CTAs */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Start a conversation</p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/match/chat"
            className="flex flex-col items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-5 text-white transition-colors hover:bg-blue-700"
          >
            <MessageSquare className="size-6" />
            <span className="text-sm font-semibold">Chat Match</span>
            <span className="text-xs opacity-75">Text · Instant</span>
          </Link>
          <Link
            href="/match/video"
            className="flex flex-col items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-5 text-white transition-colors hover:bg-violet-700"
          >
            <Video className="size-6" />
            <span className="text-sm font-semibold">Video Match</span>
            <span className="text-xs opacity-75">Video · Voice · Chat</span>
          </Link>
        </div>
      </div>

      {/* AI Weekly Insight */}
      <div className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">AI Weekly Insight</p>
            <p className="text-xs text-muted-foreground">
              {aiInsight.week} · {aiInsight.language}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/60 p-3 text-center">
            <p className="text-lg font-bold">{aiInsight.speakingHours}</p>
            <p className="text-[11px] text-muted-foreground">Speaking</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3 text-center">
            <p className="text-lg font-bold">{aiInsight.sessions}</p>
            <p className="text-[11px] text-muted-foreground">Sessions</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{aiInsight.growthPct}</p>
            <p className="text-[11px] text-muted-foreground">vs last wk</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Fluency progress</span>
            <span className="font-semibold">{aiInsight.fluencyPct}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${aiInsight.fluencyPct}%` }}
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-sm">
          💡 <span className="font-medium">Tip:</span>{" "}
          <span className="text-muted-foreground">{aiInsight.tip}</span>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <Calendar className="size-4 text-primary" /> Upcoming Sessions
            </h3>
            <Link href="/schedule" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {scheduledSessions.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <Avatar>
                  <AvatarFallback className={`bg-gradient-to-br ${s.partner.avatarColor} text-white`}>
                    {s.partner.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.partner.name} {s.partner.flag}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.date} · {s.time} {s.timezone}
                  </p>
                </div>
                <Badge variant="secondary">{s.mode}</Badge>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <Users className="size-4 text-primary" /> Friend Activity
          </h3>
          <div className="mt-4 space-y-4">
            {friendActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <Avatar size="sm">
                  <AvatarFallback className={`bg-gradient-to-br ${a.color} text-white text-xs`}>
                    {a.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-sm">
                  <p>
                    <span className="font-medium">{a.name}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat: add ProfileCompletionCard to dashboard"
```

---

## Task 12: Settings Integration

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`

The settings page already fetches user data via `/api/user/me` on mount. Add profile completion state and a new `"setup"` tab.

- [ ] **Step 1: Add imports and completion state**

After the existing imports at the top of `src/app/(app)/settings/page.tsx`, add:

```ts
import { useRouter } from "next/navigation"
import {
  getCompletionPercentage,
  getFirstIncompleteStep,
  STEP_PATHS,
  type UserProfileData,
} from "@/lib/onboarding-progress"
```

Inside `SettingsPage`, after the existing state declarations, add:

```ts
const router = useRouter()
const [completionPct, setCompletionPct] = React.useState(0)
const [profileData, setProfileData] = React.useState<UserProfileData | null>(null)
```

- [ ] **Step 2: Populate completion state from existing fetch**

The existing `useEffect` already fetches `/api/user/me`. Update it to also set `profileData` and `completionPct`. Find this block (around line 62):

```ts
React.useEffect(() => {
  fetch("/api/user/me")
    .then((r) => r.json())
    .then((u) => {
      setAvatarUrl(u.avatar ?? "")
      setDisplayName(u.displayName ?? "")
      setUsername(u.username ?? "")
      setEmail(u.email ?? "")
      setPlan(u.plan ?? "free")
      if (u.aiProfile) setAIProfile(u.aiProfile)
      if (u.spokenLanguages?.length) setSpoken(u.spokenLanguages as LanguageLevelEntry[])
      if (u.learningLanguages?.length) {
        const ll = u.learningLanguages as LanguageLevelEntry[]
        setLearning(ll)
        setAILearningLanguages(ll.map((l) => getLanguage(l.code)))
      }
      if (u.interests) {
        const tags = Object.values(u.interests as Record<string, string[]>).flat()
        setAIInterestTags(tags)
      }
    })
    .catch(() => {})
}, [])
```

Replace it with:

```ts
React.useEffect(() => {
  fetch("/api/user/me")
    .then((r) => r.json())
    .then((u) => {
      setAvatarUrl(u.avatar ?? "")
      setDisplayName(u.displayName ?? "")
      setUsername(u.username ?? "")
      setEmail(u.email ?? "")
      setPlan(u.plan ?? "free")
      if (u.aiProfile) setAIProfile(u.aiProfile)
      if (u.spokenLanguages?.length) setSpoken(u.spokenLanguages as LanguageLevelEntry[])
      if (u.learningLanguages?.length) {
        const ll = u.learningLanguages as LanguageLevelEntry[]
        setLearning(ll)
        setAILearningLanguages(ll.map((l) => getLanguage(l.code)))
      }
      if (u.interests) {
        const tags = Object.values(u.interests as Record<string, string[]>).flat()
        setAIInterestTags(tags)
      }
      setProfileData(u as UserProfileData)
      setCompletionPct(getCompletionPercentage(u as UserProfileData))
    })
    .catch(() => {})
}, [])
```

- [ ] **Step 3: Add the new tab trigger**

Find the `<TabsList>` block:

```tsx
<TabsList className="flex-wrap">
  <TabsTrigger value="account">Account</TabsTrigger>
  <TabsTrigger value="languages">Languages</TabsTrigger>
  <TabsTrigger value="privacy">Privacy</TabsTrigger>
  <TabsTrigger value="ai">AI Preferences</TabsTrigger>
  <TabsTrigger value="notifications">Notifications</TabsTrigger>
  <TabsTrigger value="subscription">Subscription</TabsTrigger>
</TabsList>
```

Replace with:

```tsx
<TabsList className="flex-wrap">
  <TabsTrigger value="account">Account</TabsTrigger>
  <TabsTrigger value="languages">Languages</TabsTrigger>
  <TabsTrigger value="privacy">Privacy</TabsTrigger>
  <TabsTrigger value="ai">AI Preferences</TabsTrigger>
  <TabsTrigger value="notifications">Notifications</TabsTrigger>
  <TabsTrigger value="subscription">Subscription</TabsTrigger>
  <TabsTrigger value="setup" className="relative">
    {completionPct < 100 && (
      <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary" />
    )}
    {completionPct < 100
      ? `Complete Profile (${completionPct}% complete)`
      : `Profile Setup (100% complete)`}
  </TabsTrigger>
</TabsList>
```

- [ ] **Step 4: Add the tab content**

After the last `</TabsContent>` block (before the closing `</Tabs>`), add:

```tsx
{/* Profile Setup */}
<TabsContent value="setup" className="mt-6">
  <div className="rounded-xl border bg-card p-6 shadow-sm">
    <h2 className="font-semibold text-lg">
      {completionPct < 100 ? "Complete Your Profile" : "Profile Setup"}
    </h2>
    <p className="mt-1 text-sm text-muted-foreground">
      {completionPct < 100
        ? "Finish setting up your profile to improve matching and recommendations."
        : "Your profile is complete. You can revisit any section to make changes."}
    </p>
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          if (!profileData) return
          const next = getFirstIncompleteStep(profileData)
          if (next) {
            router.push(`${STEP_PATHS[next]}?from=settings`)
          } else {
            router.push(`/profile?from=settings`)
          }
        }}
        className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {completionPct < 100 ? "Continue Setup" : "Edit Profile Setup"}
      </button>
    </div>
  </div>
</TabsContent>
```

- [ ] **Step 5: Type-check and lint**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/settings/page.tsx
git commit -m "feat: add profile setup entry to settings"
```

---

## Final Verification

- [ ] **Start dev server**

```bash
npm run dev
```

- [ ] **Test new user flow**
  1. Sign up with a new account
  2. Confirm redirect goes to `/dashboard` (not `/profile`)
  3. Confirm `ProfileCompletionCard` appears with 0% or whatever fields were pre-filled

- [ ] **Test Continue Setup from dashboard**
  1. Click "Continue Setup" on the card
  2. Confirm lands on first incomplete step with `?from=dashboard`
  3. Confirm status line shows "X of 5 sections completed"
  4. Confirm "← Dashboard" back link is present
  5. Confirm button says "Save & Continue"
  6. Fill in the step, click save → confirm redirects to next incomplete step

- [ ] **Test final step completion**
  1. Complete all 5 steps one by one
  2. On the last step, button should say "Save & Return to Dashboard"
  3. After save, confirm hard-nav to `/dashboard`
  4. Confirm `ProfileCompletionCard` is hidden (percentage = 100)

- [ ] **Test Settings entry**
  1. Go to `/settings`
  2. Confirm "Complete Profile (X% complete)" tab is visible with dot badge
  3. Click tab → confirm routes to first incomplete step with `?from=settings`
  4. Confirm "← Settings" back link appears on step page
  5. After completing all steps, confirm settings tab shows "Profile Setup (100% complete)" with no badge

- [ ] **Test Remind Me Later**
  1. Click "Remind Me Later" on card → card collapses to minimal bar
  2. Refresh page → card remains collapsed
  3. Navigate away and back → still collapsed

- [ ] **Test unsaved changes warning**
  1. Open a step page, type in a field
  2. Try to close the browser tab → browser prompt should appear
  3. Click back link without saving → confirm dialog appears
