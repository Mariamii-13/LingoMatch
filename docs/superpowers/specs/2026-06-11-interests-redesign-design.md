# Interests Selection Redesign — Design Spec

**Date:** 2026-06-11  
**Status:** Approved  
**Affected files:** `src/app/(onboarding)/interests/page.tsx`, `src/lib/mock-data.ts`

---

## Problem

Current screen shows 8 niche categories × 40+ tags all visible at once. Feels crowded. Slow to scan. Niche labels (Shonen, Slice of Life, FPS) require prior knowledge. Completion time ~30s+.

## Goal

- Completion in under 20 seconds
- Clean, minimal first impression
- Mobile-first layout
- Better matching signal without extra friction

---

## Chosen Approach: Concept B1 — Category Cards + Optional Bottom Sheet

**Interaction model:**
1. User sees 6 emoji cards in a 2×3 grid
2. Tap a card = selects that category (checkmark badge appears, `+` badge appears top-right)
3. Tap the `+` badge = opens bottom sheet with sub-interests for that category
4. Sub-interests are optional — user can close sheet without picking any
5. "Continue" is always available (no minimum selection enforced)

---

## New Category Structure

Replaces current 8 categories in `src/lib/mock-data.ts` (`interestCategories`).

| Emoji | Category | Sub-interests |
|-------|----------|---------------|
| 🎬 | Entertainment | Anime, Movies, TV Shows, Books, Podcasts |
| 🎵 | Music | K-Pop, Pop, Rock, Hip-Hop, Classical, Jazz |
| 🎮 | Gaming | RPG, Action, Strategy, Indie, Esports |
| ✈️ | Travel | Backpacking, Beaches, City Trips, Hiking, Road Trips |
| 🎨 | Creativity | Photography, Art, Writing, Dance, Fashion |
| 🌿 | Lifestyle | Fitness, Food, Cooking, Nature, Technology |

**Principles applied:**
- No genre-specific jargon (no Shonen, Slice of Life, FPS, MOBA)
- Each category is universally understood
- Sub-interests are still specific enough to drive good conversation matches

---

## Component Design

### `InterestCategoryCard`

Props: `category`, `emoji`, `selected`, `subCount`, `onSelect`, `onOpenSheet`

States:
- **Default** — white bg, `#e8e8e8` border, emoji + label
- **Selected** — `#f5f0ff` bg, `#7c3aed` border, checkmark badge (top-left), `+` badge (top-right)
- **Selected + sub-interests** — same as selected, sub-interest count shown below label (e.g. "K-Pop")

Tap behavior:
- Tap card body → toggle selection
- Tap `+` badge (only visible when selected) → `onOpenSheet(category)`

### `SubInterestSheet`

A bottom sheet (overlay) anchored to the bottom of the viewport.

Props: `category`, `emoji`, `subInterests[]`, `selected[]`, `onToggle`, `onDone`, `onSkip`

Contents:
- Drag handle bar
- Header: `{emoji} {Category} — pick any`
- Pill tag grid (multi-select, same toggle-style as current page)
- Two buttons: "Skip detail" (closes sheet, keeps category selected) + "Done" (closes sheet)

Animation: slide up from bottom, backdrop blur/dim behind.

### Page component (`OnboardingInterestsPage`)

State:
```ts
const [selectedCategories, setSelectedCategories] = useState<string[]>([])
const [subInterests, setSubInterests] = useState<Record<string, string[]>>({})
const [activeSheet, setActiveSheet] = useState<string | null>(null)
```

On Continue: builds interests object and PATCHes `/api/user/me` — same as current implementation.

---

## Data Flow

```
selectedCategories + subInterests
        ↓
  buildInterestsObj()
        ↓
PATCH /api/user/me { interests: { entertainment: [], music: ["K-Pop"], ... } }
```

`buildInterestsObj` maps selected categories to sub-interest arrays. A selected category with no sub-interests sends an empty array (signals the category-level interest).

---

## API / Schema Impact

- **API route unchanged** — `PATCH /api/user/me` accepts `interests` field as-is
- **MongoDB schema keys change** — old keys (`anime`, `books`, `movies`, `gaming`, `travel`, `food`, `hobbies`) → new keys (`entertainment`, `music`, `gaming`, `travel`, `creativity`, `lifestyle`)
- **Migration:** Not required for the redesign. Existing users' old interest keys are silently ignored. The schema in `src/lib/models/User.ts` will need updating to reflect the new keys.

---

## Layout

- Grid: `display: grid; grid-template-columns: 1fr 1fr` — 2×3 on mobile, same on desktop (interests screen is narrow in the onboarding wizard)
- Card size: fills column, ~150px min height
- Gap: `10px`
- Bottom sheet: full-width, max-height 60vh, `border-radius: 20px 20px 0 0`

---

## Animations

- Card selection: border color + bg transition, `150ms ease`
- Checkmark badge: scale-in from 0, `150ms ease`
- Bottom sheet: slide up from `translateY(100%)`, `300ms ease-out`, backdrop fades in
- Sheet dismiss: slide down, `250ms ease-in`

Use `framer-motion` (already in project at `^12.40.0`). Use `AnimatePresence` + `motion.div` for sheet and badge animations.

---

## Accessibility

- Cards are `<button>` elements, not `<div>` — keyboard navigable
- `aria-pressed` on each card reflecting selection state
- Bottom sheet traps focus while open
- `aria-label` on `+` badge: `"Add detail for {category}"`

---

## Out of Scope

- Persisting pre-selected interests from an existing user profile (onboarding is first-run only)
- Search/filter within sub-interests
- Custom interest entry ("other")
- Minimum selection requirement

---

## Success Criteria

- User can complete screen in < 20 seconds with zero sub-interest detail
- User who wants specificity can add sub-interests in 1 extra tap per category
- No more than 6 items visible before any interaction
- Screen passes mobile viewport (375px) without horizontal scroll
