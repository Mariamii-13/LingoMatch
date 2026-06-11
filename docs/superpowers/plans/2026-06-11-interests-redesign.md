# Interests Selection Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat 40-tag wall with a 2×3 emoji category card grid where tapping a card selects it and an optional `+` badge opens a bottom sheet for sub-interest detail.

**Architecture:** Data layer first (mock-data + schema + search route), then components bottom-up (`InterestCategoryCard` → `SubInterestSheet`), then wire them together in `page.tsx`. No new API routes or state managers — local React state + existing PATCH endpoint.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, framer-motion ^12.40.0, existing `Sheet` / `Button` UI primitives, `@base-ui/react/dialog` (via Sheet)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/mock-data.ts` | Replace `interestCategories` — new type with `key`, `emoji`, `subInterests` fields |
| Modify | `src/lib/models/User.ts` | Update `InterestsSchema` — 8 old keys → 6 new keys |
| Modify | `src/app/api/users/search/route.ts` | Update `VALID_INTERESTS` — old category keys → new ones |
| Create | `src/app/(onboarding)/interests/_components/InterestCategoryCard.tsx` | Card UI with 3 states + framer-motion badges |
| Create | `src/app/(onboarding)/interests/_components/SubInterestSheet.tsx` | Bottom sheet for sub-interest pill selection |
| Modify | `src/app/(onboarding)/interests/page.tsx` | Full rewrite — new state model + grid layout |

---

## Task 1: Update `interestCategories` in mock-data.ts

**Files:**
- Modify: `src/lib/mock-data.ts:57-66`

- [ ] **Step 1: Replace the `interestCategories` export**

Open `src/lib/mock-data.ts`. Find the existing `interestCategories` export (currently at line 57). Replace the entire export with:

```ts
export const interestCategories: {
  key: string
  category: string
  emoji: string
  subInterests: string[]
}[] = [
  {
    key: "entertainment",
    category: "Entertainment",
    emoji: "🎬",
    subInterests: ["Anime", "Movies", "TV Shows", "Books", "Podcasts"],
  },
  {
    key: "music",
    category: "Music",
    emoji: "🎵",
    subInterests: ["K-Pop", "Pop", "Rock", "Hip-Hop", "Classical", "Jazz"],
  },
  {
    key: "gaming",
    category: "Gaming",
    emoji: "🎮",
    subInterests: ["RPG", "Action", "Strategy", "Indie", "Esports"],
  },
  {
    key: "travel",
    category: "Travel",
    emoji: "✈️",
    subInterests: ["Backpacking", "Beaches", "City Trips", "Hiking", "Road Trips"],
  },
  {
    key: "creativity",
    category: "Creativity",
    emoji: "🎨",
    subInterests: ["Photography", "Art", "Writing", "Dance", "Fashion"],
  },
  {
    key: "lifestyle",
    category: "Lifestyle",
    emoji: "🌿",
    subInterests: ["Fitness", "Food", "Cooking", "Nature", "Technology"],
  },
]
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors on `mock-data.ts`. If the old `{ category, tags }` type is referenced elsewhere in the same file, those usages are unchanged — we're only replacing the `interestCategories` export.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mock-data.ts
git commit -m "feat: replace interestCategories with 6 universal categories (key/emoji/subInterests)"
```

---

## Task 2: Update `InterestsSchema` in User.ts

**Files:**
- Modify: `src/lib/models/User.ts:28-40`

- [ ] **Step 1: Replace the schema keys**

Open `src/lib/models/User.ts`. Find the `InterestsSchema` (lines 28–40). Replace it with:

```ts
const InterestsSchema = new Schema(
  {
    entertainment: { type: [String], default: [] },
    music: { type: [String], default: [] },
    gaming: { type: [String], default: [] },
    travel: { type: [String], default: [] },
    creativity: { type: [String], default: [] },
    lifestyle: { type: [String], default: [] },
  },
  { _id: false }
)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/User.ts
git commit -m "feat: update InterestsSchema keys to match new 6-category structure"
```

---

## Task 3: Update `VALID_INTERESTS` in search route

**Files:**
- Modify: `src/app/api/users/search/route.ts:9`

- [ ] **Step 1: Update the constant**

Open `src/app/api/users/search/route.ts`. Find line 9:

```ts
const VALID_INTERESTS = ['anime', 'books', 'movies', 'music', 'gaming', 'travel', 'food', 'hobbies']
```

Replace with:

```ts
const VALID_INTERESTS = ['entertainment', 'music', 'gaming', 'travel', 'creativity', 'lifestyle']
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/users/search/route.ts
git commit -m "feat: update search route VALID_INTERESTS to new category keys"
```

---

## Task 4: Create `InterestCategoryCard` component

**Files:**
- Create: `src/app/(onboarding)/interests/_components/InterestCategoryCard.tsx`

- [ ] **Step 1: Create the component file**

Create the directory and file:

```
src/app/(onboarding)/interests/_components/InterestCategoryCard.tsx
```

Write the full file contents:

```tsx
"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

interface InterestCategoryCardProps {
  category: string
  emoji: string
  selected: boolean
  subLabels: string[]
  onSelect: () => void
  onOpenSheet: () => void
}

export function InterestCategoryCard({
  category,
  emoji,
  selected,
  subLabels,
  onSelect,
  onOpenSheet,
}: InterestCategoryCardProps) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          "w-full min-h-[120px] rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "border-primary bg-primary/10"
            : "border-border bg-background hover:bg-accent"
        )}
      >
        <span className="text-3xl leading-none" role="img" aria-hidden>
          {emoji}
        </span>
        <span
          className={cn(
            "text-sm font-semibold",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {category}
        </span>
        {selected && subLabels.length > 0 && (
          <span className="text-xs text-primary/70 truncate max-w-full px-1 text-center">
            {subLabels.slice(0, 2).join(", ")}
            {subLabels.length > 2 ? ` +${subLabels.length - 2}` : ""}
          </span>
        )}
      </button>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm pointer-events-none"
              aria-hidden
            >
              <svg
                className="w-3 h-3 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>

            <motion.button
              key="plus"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              type="button"
              aria-label={`Add detail for ${category}`}
              onClick={(e) => {
                e.stopPropagation()
                onOpenSheet()
              }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-primary text-primary flex items-center justify-center text-sm font-bold shadow-sm hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              +
            </motion.button>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(onboarding)/interests/_components/InterestCategoryCard.tsx
git commit -m "feat: add InterestCategoryCard component with 3 states and framer-motion badges"
```

---

## Task 5: Create `SubInterestSheet` component

**Files:**
- Create: `src/app/(onboarding)/interests/_components/SubInterestSheet.tsx`

- [ ] **Step 1: Create the component file**

Write to `src/app/(onboarding)/interests/_components/SubInterestSheet.tsx`:

```tsx
"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface SubInterestSheetProps {
  open: boolean
  category: string
  emoji: string
  subInterests: string[]
  selected: string[]
  onToggle: (interest: string) => void
  onDone: () => void
  onSkip: () => void
}

export function SubInterestSheet({
  open,
  category,
  emoji,
  subInterests,
  selected,
  onToggle,
  onDone,
  onSkip,
}: SubInterestSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onSkip()
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-2xl max-h-[60vh] px-4 pb-8"
      >
        <div className="w-8 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4 mt-2" />
        <SheetHeader className="p-0 mb-4">
          <SheetTitle className="text-base font-semibold">
            {emoji} {category} — pick any
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 mb-6 overflow-y-auto max-h-[30vh]">
          {subInterests.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => onToggle(interest)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected.includes(interest)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {interest}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onSkip}>
            Skip detail
          </Button>
          <Button className="flex-1" onClick={onDone}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(onboarding)/interests/_components/SubInterestSheet.tsx
git commit -m "feat: add SubInterestSheet component using bottom Sheet"
```

---

## Task 6: Rewrite `page.tsx`

**Files:**
- Modify: `src/app/(onboarding)/interests/page.tsx` (full rewrite)

- [ ] **Step 1: Replace the full file contents**

Write to `src/app/(onboarding)/interests/page.tsx`:

```tsx
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
    if (!selectedCategories.includes(key)) {
      setSelectedCategories((prev) => [...prev, key])
    }
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
          <Button onClick={handleContinue} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(onboarding)/interests/page.tsx
git commit -m "feat: rewrite interests page with category card grid and bottom sheet (Concept B1)"
```

---

## Task 7: Manual Verification

**Files:** None — browser testing only

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Navigate to `http://localhost:3000/interests` (or start the onboarding flow from the beginning).

- [ ] **Step 2: Verify the grid**

Confirm:
- 6 emoji cards in a 2×3 grid are visible
- No interests are pre-selected (all cards have white bg, grey border)
- Subtitle "Tap topics you love. Add detail anytime." is present
- Count shows "0 selected"

- [ ] **Step 3: Verify card selection**

Tap any card (e.g. Music):
- Card background turns purple-tinted (`bg-primary/10`)
- Border turns purple (`border-primary`)
- Checkmark badge appears top-left (animated scale-in)
- `+` badge appears top-right (animated scale-in)
- Counter increments to "1 selected"

Tap the same card again:
- Card returns to default state
- Both badges disappear (animated scale-out)
- Counter decrements

- [ ] **Step 4: Verify bottom sheet**

Select a card, then tap the `+` badge:
- Bottom sheet slides up from bottom
- Backdrop dims behind it
- Sheet header shows `{emoji} {category} — pick any`
- Sub-interests render as pill buttons (unselected state)
- "Skip detail" and "Done" buttons are visible

Select one or more sub-interests inside the sheet:
- Pill turns purple when selected, white when deselected

Tap "Done":
- Sheet slides down and closes
- Card now shows selected sub-interest name(s) below the category label (up to 2, then `+N`)

Tap "Skip detail":
- Sheet closes without adding sub-interests
- Card remains selected but shows no sub-interest labels

- [ ] **Step 5: Verify the complete flow**

Select 2–3 categories, add detail to one, then tap "Continue":
- Verify no JS errors in browser console
- Verify the `PATCH /api/user/me` request fires (check Network tab)
- Verify payload shape: `{ interests: { music: ["K-Pop"], travel: [], ... } }`
- Verify redirect to `/mode`

- [ ] **Step 6: Verify mobile viewport**

In browser DevTools, switch to a 375px wide viewport (iPhone SE size):
- All 6 cards visible in 2-column grid
- No horizontal scroll
- Bottom sheet uses full width

- [ ] **Step 7: Final commit if any tweaks were made**

```bash
git add -p
git commit -m "fix: interests redesign tweaks from manual verification"
```
