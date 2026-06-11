# Deferred Onboarding — Design Spec
_2026-06-12_

## Problem

After signup/login, users are immediately blocked by a 5-step onboarding wizard (`src/proxy.ts:24-28`). This creates friction before users experience the product, likely reducing activation.

## Goal

Let users enter the app immediately after signup. Encourage profile completion through a persistent but non-blocking dashboard card. Never block app access based on onboarding state.

---

## 1. Routing Change

**File:** `src/proxy.ts`

Remove the middleware block that redirects `onboardingCompleted: false` users to `/profile`. Auth callbacks already redirect to `/dashboard` after login/signup — no other routing changes needed.

`onboardingCompleted` remains on the user model as the canonical flag for "all 5 steps have been explicitly completed at least once." It is no longer used to gate app access.

---

## 2. Completion Utility

**File:** `src/lib/onboarding-progress.ts` (new)

Derives per-step completion from existing user fields. No schema changes or migrations required.

### Step completion criteria

| Step | Complete when |
|---|---|
| Profile | `displayName` && `username` && `country` are non-empty |
| Languages | `spokenLanguages.length > 0` AND `learningLanguages.length > 0` |
| Interests | At least one interest selected across any category in `interests` |
| AI Preferences | Any of: `aiProfile.conversationGoals`, `aiProfile.preferredTraits`, `aiProfile.personalityNotes`, `aiProfile.topicsToAvoid` is non-empty |
| Modes | `conversationModes.length > 0` |

### Exports

```ts
export type OnboardingStep = 'profile' | 'languages' | 'interests' | 'ai-preferences' | 'modes'

export const STEP_ORDER: OnboardingStep[] = [
  'profile', 'languages', 'interests', 'ai-preferences', 'modes'
]

export const STEP_PATHS: Record<OnboardingStep, string> = {
  'profile':         '/profile',
  'languages':       '/languages',
  'interests':       '/interests',
  'ai-preferences':  '/ai-preferences',
  'modes':           '/mode',
}

// Returns completion status for each step
export function getStepStatus(user: User): Record<OnboardingStep, boolean>

// Returns first incomplete step, or null if all done
export function getFirstIncompleteStep(user: User): OnboardingStep | null

// Returns 0–100
export function getCompletionPercentage(user: User): number
```

---

## 3. Dashboard Completion Card

**Component:** `src/components/profile-completion-card.tsx` (new)

### Visibility

Show when `getCompletionPercentage(user) < 100`. Hidden when percentage reaches 100, regardless of `onboardingCompleted` flag. Reappears if the user later removes profile data and percentage drops below 100.

### Collapsed state

"Remind Me Later" collapses the card to a minimal bar (title + percentage + "Resume" link). Collapsed state persists in `localStorage` (key: `profileCardCollapsed`). Resets to expanded if percentage changes.

### Expanded layout (compact pill variant)

```
┌─────────────────────────────────────────────────────┐
│ Complete your profile                    60%    [✕] │
│ Improve matching quality and recommendations         │
│ ─────────────────────────────────────────────────── │
│ ████████████░░░░░░░░░░  (progress bar)              │
│                                                      │
│ [✓ Profile] [✓ Languages] [○ Interests]             │
│ [○ AI Preferences] [✓ Modes]                        │
│                                                      │
│ [Continue Setup]  [Remind Me Later]                 │
└─────────────────────────────────────────────────────┘
```

- ✓ pills: green tint border, green checkmark
- ○ pills: neutral border, muted text
- Progress bar: fills to `completionPercentage`%
- ✕ triggers collapse (same as "Remind Me Later")
- "Continue Setup" → `getFirstIncompleteStep(user)` path + `?from=dashboard`

---

## 4. Onboarding Pages

**Files:** `src/app/(onboarding)/layout.tsx` and each step page

### Layout changes

Remove from `(onboarding)/layout.tsx`:
- Step counter ("Step X of 5")
- Progress bar
- Wizard wrapper

### Per-page additions

Each step page gains:

1. **Status line** (top): `"3 of 5 sections completed"` — computed as `Object.values(getStepStatus(user)).filter(Boolean).length` of 5
2. **Back link** (top-left):
   - `← Dashboard` when `?from` is absent or `from=dashboard`
   - `← Settings` when `?from=settings`
3. **Primary button label**:
   - `"Save & Continue"` — when other incomplete steps remain after saving this one
   - `"Save & Return to Dashboard"` — when saving this step completes the last missing step
4. **Unsaved-changes warning**: prompt on navigate-away if form is dirty

### Post-save redirect

After a successful save:
- Re-evaluate `getFirstIncompleteStep(user)` with updated data
- If a next incomplete step exists → redirect to it (preserving `?from` param)
- If none remain → set `onboardingCompleted: true`, redirect to `/dashboard`

### Final completion

When all 5 steps pass:
- PATCH `/api/user/me` with `{ onboardingCompleted: true }`
- Redirect to `/dashboard`
- Dashboard card hidden (percentage = 100)

---

## 5. Settings Entry

**File:** `src/app/(app)/settings/page.tsx`

Add a new entry in the settings sidebar/tab list:

| State | Label | Badge |
|---|---|---|
| `completionPercentage < 100` | "Complete Profile (60% complete)" | dot indicator |
| `completionPercentage === 100` | "Profile Setup (100% complete)" | none |

### Navigation

- Incomplete: navigates to `getFirstIncompleteStep(user)` path + `?from=settings`
- Complete: navigates to `/profile?from=settings` (entry point for editing)

Back link in each step page reads `← Settings` when `?from=settings`.

---

## 6. Data Flow Summary

```
Signup/Login
    │
    ▼
/dashboard (always)
    │
    ├── completionPercentage < 100?
    │       └── Show ProfileCompletionCard
    │               └── "Continue Setup" → getFirstIncompleteStep()
    │                       └── Step page (?from=dashboard)
    │                               └── Save → next incomplete or dashboard
    │
    └── Settings → "Complete Profile / Profile Setup"
                        └── getFirstIncompleteStep() or /profile (?from=settings)
                                └── Step page → Save → next incomplete or dashboard
```

---

## 7. Non-Goals

- No changes to `/api/user/me` schema
- No new DB fields
- No changes to form content within onboarding step pages
- No mobile-specific layout work (card is responsive but not custom per breakpoint)
