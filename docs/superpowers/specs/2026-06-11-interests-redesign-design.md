# Interests Selection Redesign — Design Spec

**Date:** 2026-06-11  
**Status:** Approved (v2 — B2 stacked)  
**Affected files:** `src/app/(onboarding)/interests/page.tsx`, `src/lib/mock-data.ts`

> **v2 change:** Replaced B1 (card + bottom sheet) with B2 stacked (card expands full-width in-place). Bottom sheet, `+` badge, and `activeSheet` state removed entirely.

---

## Problem

Current screen shows 8 niche categories × 40+ tags all visible at once. Feels crowded. Slow to scan. Niche labels (Shonen, Slice of Life, FPS) require prior knowledge. Completion time ~30s+.

## Goal

- Completion in under 20 seconds
- Clean, minimal first impression
- Mobile-first layout
- Better matching signal without extra friction
- Sub-interests discoverable without requiring an extra tap or modal

---

## Chosen Approach: Concept B2 Stacked — Inline Full-Width Expansion

**Interaction model:**
1. User sees 6 emoji cards in a 2-column grid
2. Tap a card → card selected immediately AND expands to full width (`grid-column: 1 / -1`) in its original grid position
3. Expanded card shows: header row (checkmark · emoji · name) + sub-interest pill row below
4. Subsequent cards reflow one slot — card does not jump to a different screen area
5. Sub-interests are optional — tapping a pill toggles it on/off, expanding/collapsing does not affect selection state
6. Tapping the expanded card header toggles the pill row open/closed (collapse without deselecting)
7. Tapping an expanded selected card header a second time deselects the category
8. On **first** selection of a category the pill row opens automatically — users immediately discover optional depth
9. Continue is enabled when ≥1 category selected; disabled at 0

---

## New Category Structure

Replaces current 8 categories in `src/lib/mock-data.ts` (`interestCategories`).

| Emoji | Key | Category | Sub-interests |
|-------|-----|----------|---------------|
| 🎬 | `entertainment` | Entertainment | Anime, Movies, TV Shows, Books, Podcasts |
| 🎵 | `music` | Music | K-Pop, Pop, Rock, Hip-Hop, Classical, Jazz |
| 🎮 | `gaming` | Gaming | RPG, Action, Strategy, Indie, Esports |
| ✈️ | `travel` | Travel | Backpacking, Beaches, City Trips, Hiking, Road Trips |
| 🎨 | `creativity` | Creativity | Photography, Art, Writing, Dance, Fashion |
| 🌿 | `lifestyle` | Lifestyle | Fitness, Food, Cooking, Nature, Technology |

**Principles applied:**
- No genre-specific jargon (no Shonen, Slice of Life, FPS, MOBA)
- Each category is universally understood
- Sub-interests specific enough to drive good conversation matches

---

## Component Design

### `InterestCategoryCard`

**Props:**
```ts
interface InterestCategoryCardProps {
  category: string
  emoji: string
  selected: boolean
  expanded: boolean        // pill section visible
  subInterests: string[]   // full list for this category
  selectedSubs: string[]   // which subs are currently picked
  onSelect: () => void     // toggles selection (and auto-expands on first select)
  onToggleSub: (interest: string) => void
  onToggleExpand: () => void  // collapse/expand pill section without deselecting
}
```

**Layout states:**

| State | Grid span | Card layout |
|---|---|---|
| Default | `auto` (half-width) | Emoji centered + label |
| Selected + expanded | `1 / -1` (full-width) | Row 1: `✓` · emoji · name · collapse chevron · Row 2: pill strip |
| Selected + collapsed | `1 / -1` (full-width) | Row 1 only: `✓` · emoji · name · selected-sub-count · expand chevron |

**Tap targets:**
- Tap default card → `onSelect()` (selects + auto-expands)
- Tap expanded card header → `onToggleExpand()` (collapses pill row, keeps selected)
- Tap collapsed selected card header → `onToggleExpand()` (re-expands)
- Double-tap or second tap on card when pills collapsed → `onSelect()` only fires on the card body when unselected; deselect via dedicated close/X or second header tap when pills already collapsed

> **Deselect rule (simple):** Tap a selected+collapsed card → deselects it. Tap a selected+expanded card header → collapses pills first. This prevents accidental deselection while browsing sub-interests.

### Page component (`OnboardingInterestsPage`)

**State:**
```ts
const [selectedCategories, setSelectedCategories] = useState<string[]>([])
const [subInterests, setSubInterests] = useState<Record<string, string[]>>({})
const [expandedCategories, setExpandedCategories] = useState<string[]>([])
```

No `activeSheet` state — bottom sheet is removed.

**`toggleCategory(key)`:**
```ts
function toggleCategory(key: string) {
  setSelectedCategories(prev => {
    if (prev.includes(key)) {
      // deselecting — also collapse
      setExpandedCategories(e => e.filter(k => k !== key))
      return prev.filter(k => k !== key)
    }
    // selecting — auto-expand so user discovers sub-interests
    setExpandedCategories(e => e.includes(key) ? e : [...e, key])
    return [...prev, key]
  })
}
```

**`toggleExpand(key)`:**
```ts
function toggleExpand(key: string) {
  setExpandedCategories(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  )
}
```

**`toggleSubInterest(key, interest)`:** unchanged from v1.

On Continue: same `buildInterestsObj` + `PATCH /api/user/me` as v1.

---

## Removed Components

- `SubInterestSheet` — deleted entirely
- `+` badge — removed from `InterestCategoryCard`
- `activeSheet` state — removed from page

---

## Data Flow

```
selectedCategories + subInterests
        ↓
  buildInterestsObj()
        ↓
PATCH /api/user/me { interests: { entertainment: ["Movies","Anime"], music: [], ... } }
```

`buildInterestsObj` maps each selected category key → its sub-interest array (empty array if none picked).

---

## API / Schema Impact

No change from v1:
- **API route unchanged** — `PATCH /api/user/me` accepts `interests` as-is
- **MongoDB schema keys** — already updated to 6 new keys in v1 implementation

---

## Layout

- Grid: `grid-template-columns: 1fr 1fr`, `gap: 10px`
- Default card: fills one column, `min-height: 110px`, centered column layout
- Selected card: `grid-column: 1 / -1`, full-width, `padding: 14px`
- Selected card — expanded inner layout:
  - **Header row**: `display: flex; align-items: center; gap: 8px` — checkmark dot · emoji (20px) · category name · spacer · chevron icon
  - **Pills row**: `display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(primary, 0.2)`
- Pills available width: ~260px at 300px viewport (comfortable 4–5 per row)

---

## Animations

All via `framer-motion` (project already has `^12.40.0`).

| Element | Animation |
|---|---|
| Card expansion (half → full width) | `layout` prop on card — framer-motion handles grid reflow smoothly |
| Pill section appear/collapse | `AnimatePresence` + `motion.div` with `initial={{ height: 0, opacity: 0 }}` → `animate={{ height: 'auto', opacity: 1 }}`, `exit={{ height: 0, opacity: 0 }}`, `transition={{ duration: 0.2, ease: 'easeOut' }}`  |
| Checkmark dot | `motion.div` scale-in `0 → 1`, `150ms easeOut` |
| Chevron rotation | `motion.span` `rotate: 0 → 180` on expand, `150ms easeOut` |
| Border/bg color shift | Tailwind `transition-colors duration-150` (no framer needed) |

> `layout` prop on the card `motion.div` is the key: it animates the grid-column change (half → full width) without JS-driven position calculation.

---

## Accessibility

- Cards are `<button>` elements — keyboard navigable
- `aria-pressed` on card reflecting selection state
- `aria-expanded` on card reflecting pill-row open state
- `aria-label` on chevron: `"Show sub-interests for {category}"` / `"Hide sub-interests for {category}"`
- Sub-interest pills are `<button>` elements with `aria-pressed`
- No focus trap needed (no modal/sheet)
- Pill section uses `aria-hidden={!expanded}` when collapsed

---

## Out of Scope

- Persisting pre-selected interests from existing profile (onboarding is first-run only)
- Search/filter within sub-interests
- Custom interest entry ("other")
- Minimum selection requirement
- Long-press gesture
- Bottom sheet

---

## Success Criteria

- User can complete screen in < 20 seconds with zero sub-interest detail
- Sub-interests are visible on first tap — no secondary affordance (badge, modal) required
- Cards expand in-place — no positional jump; user retains spatial context
- All 5 sub-interest pills fit in a single row on 375px viewport for categories with short labels; 2-row wrap acceptable for longer labels (Travel)
- Screen passes mobile viewport (375px) without horizontal scroll
