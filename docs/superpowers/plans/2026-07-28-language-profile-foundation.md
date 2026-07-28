# Language Profile Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist a canonical multilingual learning profile, require it during onboarding, and make AI tutoring consume it automatically.

**Architecture:** Add a versioned embedded profile to `User`, centralize normalization and compatibility migration, enforce profile completion through the existing auth proxy, and make the AI route authoritative for learner context. Keep existing language fields synchronized until matching and discovery can migrate independently.

**Tech Stack:** Next.js 16 App Router, React 19, NextAuth 5, Mongoose 9, Zod 4, Vitest 4, Tailwind CSS 4.

## Global Constraints

- Keep `google/gemini-2.5-flash`, OpenRouter, NextAuth providers, and deployment unchanged.
- Preserve existing users and all legacy language data.
- Do not redesign unrelated UI or implement new matching.
- Use the existing `/languages` onboarding route.

---

### Task 1: Language profile domain and migration

**Files:**
- Create: `src/lib/language-profile.ts`
- Create: `src/lib/language-profile.test.ts`
- Modify: `src/lib/models/User.ts`

- [ ] Write failing normalization, legacy migration, completeness, and compatibility tests.
- [ ] Implement canonical types and pure normalization/resolution helpers.
- [ ] Add the embedded Mongoose schema and query indexes.
- [ ] Lazily persist complete legacy profiles through the shared production normalizer.
- [ ] Run focused tests and TypeScript.
- [ ] Commit the domain foundation.

### Task 2: Validated profile API and auth enforcement

**Files:**
- Create: `src/lib/validations/language-profile.ts`
- Create: `src/lib/validations/language-profile.test.ts`
- Create: `src/app/api/user/me/language-profile/route.ts`
- Modify: `src/app/api/user/me/route.ts`
- Modify: `src/auth.ts`
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/proxy.ts`

- [ ] Write failing validation and redirect-policy tests.
- [ ] Add GET/PUT language-profile API with compatibility writes.
- [ ] Lazily backfill compatible legacy profiles during authenticated user reads.
- [ ] Add `languageProfileComplete` to JWT/session and enforce onboarding redirects.
- [ ] Run focused tests, TypeScript, and lint on touched files.
- [ ] Commit API and enforcement.

### Task 3: Required language onboarding

**Files:**
- Modify: `src/constants/languages.ts`
- Modify: `src/app/(onboarding)/languages/page.tsx`
- Modify: `src/lib/onboarding-progress.ts`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] Add the `unsure` level and display label.
- [ ] Load canonical profile values into the existing language page.
- [ ] Collect preferred explanation language and remove the skip path.
- [ ] Save through the dedicated profile API and keep onboarding progress compatible.
- [ ] Expose the same profile fields in Settings without changing unrelated tabs.
- [ ] Run component/type checks and commit onboarding.

### Task 4: Server-authoritative AI personalization

**Files:**
- Modify: `src/config/ai-practice.ts`
- Modify: `src/lib/validations/ai-practice.ts`
- Modify: `src/lib/validations/ai-practice.test.ts`
- Modify: `src/lib/ai/prompts.ts`
- Modify: `src/lib/ai/prompts.test.ts`
- Modify: `src/lib/ai/openrouter.ts`
- Modify: `src/lib/ai/openrouter.test.ts`
- Modify: `src/app/api/ai-practice/route.ts`
- Modify: `src/app/(app)/ai-practice/AIPracticeClient.tsx`
- Modify: `src/app/(app)/ai-practice/AIPracticeClient.test.tsx`

- [ ] Change client validation from arbitrary language/level to a saved target code.
- [ ] Load and authorize the profile and target server-side.
- [ ] Extend tutor context and prompt with native, target, level, and explanation language.
- [ ] Make setup select only saved targets and derive level automatically.
- [ ] Preserve provider/model/timeout behavior.
- [ ] Run AI and component tests, then commit personalization.

### Task 5: Cleanup and full verification

**Files:**
- Delete only confirmed unreferenced `*-Gstore` files and unused message list code if repository search confirms zero imports.
- Modify only touched files required to resolve new lint/test/build regressions.

- [ ] Confirm compatibility fields remain available to matching, profiles, and sessions.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run ESLint and distinguish baseline failures from regressions.
- [ ] Run Vitest with constrained workers.
- [ ] Run `npm run build` with network access for `next/font`.
- [ ] Review diff and security-sensitive routes.
- [ ] Commit cleanup/verification fixes, verify clean tree, and push `main`.
