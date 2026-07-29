# LingoMatch — Project Passport

**Permanent handover document.** Written to be sufficient on its own: a senior engineer or a
fresh AI assistant should be able to continue this project from this file alone, without any
prior conversation history.

Last updated in the final-review pass that closed the user-blocking / moderation-audit-trail
block, in the commit directly on top of `9f401ed`.

> **Read section 16 and 17 first if you are an AI assistant picking this up.** They contain
> the operating instructions and the reasoning that exists nowhere else in the repository.
> **Section 18 is binding product direction** set by the owner — it constrains architecture and
> roadmap choices, and it is not a backlog of tasks to start.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Repository status](#2-repository-status)
3. [Complete feature inventory](#3-complete-feature-inventory)
4. [Architecture](#4-architecture)
5. [Infrastructure](#5-infrastructure)
6. [Security review](#6-security-review)
7. [Performance review](#7-performance-review)
8. [Production readiness](#8-production-readiness)
9. [Technical debt](#9-technical-debt)
10. [Business readiness](#10-business-readiness)
11. [Product decisions](#11-product-decisions)
12. [Remaining roadmap](#12-remaining-roadmap)
13. [Lessons learned](#13-lessons-learned)
14. [Testing](#14-testing)
15. [Final engineering assessment](#15-final-engineering-assessment)
16. [Instructions for the next AI assistant](#16-instructions-for-the-next-ai-assistant)
17. [Project memory](#17-project-memory)
18. [Permanent product direction](#18-permanent-product-direction)

---

## 1. Executive summary

### What LingoMatch is

LingoMatch is a language-learning web application built around two complementary ways to
practise:

1. **AI tutor practice** — a learner chats with an LLM tutor in a target language. The tutor is
   configured from the learner's saved language profile (native languages, target language, CEFR
   level, and the language they want explanations in) and a chosen practice mode (Free
   Conversation, Daily Life, Travel, Job Interview, Vocabulary Practice, Grammar Practice). It
   corrects mistakes inline and keeps the conversation going. Available instantly, with no
   partner and no waiting.
2. **Human language exchange** — a learner is matched with another user on a reciprocal basis
   (A speaks what B is learning and vice versa) for a text conversation, with optional live
   video. Video is deliberately optional throughout the product, never a requirement. **This is
   the current, built state.** The owner's binding long-term direction (18.5) is for live voice
   conversation to become the primary human-exchange mode, with text demoted to a supporting
   feature — not yet implemented; read 18.5 before changing matching, messaging or the dashboard.

Supporting features: profiles, friend requests, a persistent conversation list, partner
discovery/search, practice history, and an admin console.

### Target users

Self-directed adult language learners who want conversation practice specifically — not
vocabulary drills or gamified lessons. The AI tutor serves learners who are nervous about
speaking to strangers or who want practice at 2am; human exchange serves learners who want
authentic conversation and cultural contact. The product's positioning is explicitly
"practise your way" — text-first, video optional — which differentiates it from
video-first exchange apps that intimidate beginners.

### Business model

**Currently: none. The product is free and has no billing.**

There is vestigial billing scaffolding in the codebase (a `plan` field on users, a
`PricingPlan` model, `/api/admin/plans`, `/api/admin/billing`, `stripeCustomerId` on the user
document). None of it is wired to a payment provider. Earlier in the project a `/subscription`
page presented a premium tier with per-day limits, video calls and AI coaching; it was deleted
because none of it existed and it directly contradicted the landing page's own statement that
paid plans are not being offered. **Do not resurrect paid-tier UI until billing actually
exists** (see section 11).

The intended eventual model, inferable from the scaffolding, is freemium: free tier with
capped AI practice, paid tier with more. Nothing has been committed to.

### Vision

A learner opens LingoMatch and is practising within one screen — no lesson tree, no streak
guilt, no forced video. The AI tutor is the always-available floor; human exchange is the
ceiling. The product should feel honest: if a number cannot be counted it is not shown, and if
a feature does not work it does not appear.

### Current maturity

The application is **feature-complete for a closed beta and structurally sound**, but it has
one hard external blocker (AI provider quota) and one genuine user-facing gap (no self-service
password recovery).

Eighteen engineering phases were completed in a single intensive pass. The dominant theme was
**replacing fiction with function**: when work started, the AI tutor — the core product — was
completely non-functional in production, and several fully-built pages presented fabricated
data as real. All of that is resolved.

### Current production readiness

| Dimension | State |
|---|---|
| Builds and typechecks | Clean |
| Automated tests | 287 passing |
| Lint | 0 errors, 0 warnings |
| Core AI tutor | Works, persists, streams, is metered |
| Human matching | Works (a severe silent bug was fixed) |
| Messaging | Works cross-account |
| Auth | Works (Google + credentials), rate-limited |
| Fabricated data | None remaining anywhere |
| **Blocker** | AI provider allows **50 requests/day account-wide** |
| **Gap** | No self-service password reset (no email provider) |

**Verdict: ready for a closed beta with a handful of testers today. Not ready for a public
beta until the AI quota is raised (~$10) and password recovery exists.**

### Overall health of the repository

Good, and materially better than when this work began.

**Strengths:** consistent Next.js App Router idioms; server-side data fetching on the hot
paths; a single well-tested rate limiter reused across every abuse-prone endpoint; Zod
validation at API boundaries; genuine separation between pure logic (unit tested) and I/O;
comments that explain *why* rather than *what*, particularly around non-obvious decisions.

**Weaknesses:** some admin pages are only statically verified because admin access was
unavailable; a database shared between development and production; test data in the production
database.

There is no dead fabricated data, no known IDOR, no unhandled-error blank screens, and no
lint suppressions used to hide real problems.

---

## 2. Repository status

### Git

| | |
|---|---|
| **Remote** | `https://github.com/Mariamii-13/LingoMatch.git` |
| **Branch** | `main` (also the default/PR base branch) |
| **HEAD** | `9f401ed` — "docs: close the blocking/moderation block and record voice-first direction" — plus this final-review commit on top |
| **Working tree** | Clean at time of writing |
| **Local vs remote** | In sync as of `9f401ed`, no divergence. The server-rendering work was developed on `perf/server-render-friends-settings-theme` and fast-forwarded into `main`; every block since (error-observability, CSP, and this one) was committed directly on `main` and pushed, so there is no branch left to merge. |
| **Git user** | `mariamii13` |

All 19 phases are committed and pushed. Every commit message is long-form and explains the
reasoning, not just the change — **the git log is a primary source of design rationale and is
worth reading.**

### Phase history (oldest → newest)

```
e871c08  fix: keep the AI tutor working when a model is unavailable
29c2c16  refactor: stop shipping invented data as real product surfaces
39fe2ff  feat: meter AI tutor requests against a shared daily budget
870d211  feat: give the app real not-found, error and loading states
061f8ca  fix: match reciprocal partners regardless of language-code casing
21cbb41  fix: remove cascading renders and stale-response races
259a0b0  fix: make friend requests reachable so recipients can answer them
f8d6019  feat: persist AI tutor sessions so practice survives a reload
b0c5ca2  feat: stream tutor replies instead of waiting behind a spinner
01c4407  refactor: remove the last invented data from the admin console
c2e66bf  refactor: render the dashboard and navigation identity on the server
96020f0  fix: render flags as images and make user search usable by keyboard
e792290  fix: explain CEFR levels and reset the language filter after picking
8db96de  fix: throttle sign-in, registration and avatar uploads
2bc8db5  fix: stop promising password reset and email verification that do not exist
c532d52  feat: make the Progress page show real practice history
c4554ba  perf: bound the progress queries and surface practice on the dashboard
9dd30e5  fix: show the newest messages in long conversations
055506e  docs: add PROJECT_PASSPORT.md as the permanent handover document
7ff87da  perf: render the last two client-fetched pages on the server
c9cee82  perf: serve the site palette from the server instead of a per-page fetch
5c548f4  docs: bring the passport up to date with the server-rendering work
0f7fbdb  perf: read the friend count and the theme in parallel
6a3d27f  docs: record the merged branch state in the passport
0d8c90b  feat: make production failures visible instead of silent
7fa3f3d  docs: record the error reporting work in the passport
1d8c98d  docs: close the observability block and record product direction
4926443  feat: add a Content Security Policy and security headers
cfaa8a2  docs: close the CSP block and record what was verified
f9b433b  feat: add user blocking and a moderation audit trail
9f401ed  docs: close the blocking/moderation block and record voice-first direction
```

Cumulative diff versus the pre-work baseline (`340b48a`): **133 files changed, +9154 / −4368**,
of which this document is roughly 2,600 lines.

### Technology stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router (Turbopack) | 16.2.6 |
| Runtime | Node.js | 24 LTS local; Vercel default in prod |
| Language | TypeScript | 5.x, strict |
| UI runtime | React | 19.2.4 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | 4.x |
| Components | Base UI (`@base-ui/react`), shadcn-style local `ui/` | 1.5.0 |
| Icons | `lucide-react` | 1.17.0 |
| Auth | Auth.js / NextAuth | 5.0.0-beta.31 |
| Database | MongoDB via Mongoose | mongoose 9.6.3 |
| AI | OpenRouter HTTP API (no SDK) | — |
| Realtime + video | LiveKit (`livekit-client`, `livekit-server-sdk`, `@livekit/components-react`) | 2.x |
| File storage | Cloudinary | 2.10.0 |
| Validation | Zod | 4.4.3 |
| Tests | Vitest + Testing Library + jsdom | vitest 4.1.10 |
| Toasts | `sonner` | 2.0.7 |
| Theme | `next-themes` | 0.4.6 |
| Password hashing | `bcryptjs`, cost 12 | 3.0.3 |

### Repository layout

```
/
├── AGENTS.md                  ← IMPORTANT: instructs reading node_modules/next/dist/docs
├── CLAUDE.md                  ← imports AGENTS.md
├── PROJECT_PASSPORT.md        ← this file
├── README.md
├── plan.md                    ← historical, superseded by this document
├── start-dev.bat              ← WARNING: uses port 3001, see section 5
├── docs/superpowers/
├── scripts/verify-openrouter.mjs
├── eslint.config.mjs
├── vitest.config.ts
├── next.config.ts
├── postcss.config.mjs
├── components.json            ← shadcn config
└── src/
    ├── app/
    │   ├── layout.tsx            root layout, title template, providers
    │   ├── page.tsx              public landing page
    │   ├── error.tsx             root error boundary
    │   ├── global-error.tsx      last-resort boundary (own <html>/<body>)
    │   ├── not-found.tsx         branded 404
    │   ├── (auth)/               login, register, forgot-password
    │   ├── (onboarding)/         languages, profile, interests, mode, ai-preferences
    │   ├── (app)/                signed-in shell: sidebar + navbar + mobile nav
    │   │   ├── error.tsx         in-app error boundary (keeps navigation)
    │   │   ├── not-found.tsx     in-app 404 (keeps navigation)
    │   │   ├── loading.tsx       in-app streaming fallback
    │   │   └── …                 dashboard, ai-practice, explore, friends, messages,
    │   │                         match, progress, settings, profile, chat
    │   ├── (admin)/              admin console, role-gated
    │   ├── session/              standalone video/chat session shells (no app chrome)
    │   └── api/                  50 route handlers
    ├── auth.ts                   NextAuth config: providers, callbacks, JWT
    ├── proxy.ts                  middleware (Next 16 naming): auth + onboarding gate
    ├── components/
    │   ├── ui/                   local primitives (button, dialog, tabs, …)
    │   ├── shared/               brand-mark, flag-image, nav, user-search, status-screen
    │   ├── session/              PreJoinScreen, VideoSession, ChatSession, SessionControls
    │   ├── match/                MatchConfigForm, SearchingState, MatchFoundModal
    │   ├── messages/             MessengerShell
    │   ├── onboarding/           OnboardingStepBar
    │   └── ai-preferences/       AIPreferencesForm
    ├── lib/
    │   ├── models/               12 Mongoose models
    │   ├── ai/                   openrouter, models (chain), prompts, tutor-context,
    │   │                         tutor-budget, tutor-session.server
    │   ├── messages/             reconcile, realtime, access, routes, history-window tests
    │   ├── matching/             CompatibilityProvider interface + RuleBasedProvider
    │   ├── validations/          Zod schemas: auth, ai-practice, match, language-profile
    │   ├── db.ts                 cached Mongoose connection + timeouts
    │   ├── rateLimit.ts          MongoDB fixed-window limiter
    │   ├── auth-throttle.ts      login/register limits
    │   ├── request-identity.ts   client IP + hashed rate-limit subjects
    │   ├── progress.server.ts    practice history aggregation
    │   ├── user-profile.server.ts shared profile read + migrations
    │   └── friend-requests.server.ts pending-request count for nav
    ├── constants/                languages (237 lines), countries, interests,
    │                             conversation-modes
    ├── config/ai-practice.ts     practice modes, CEFR levels
    ├── hooks/                    use-setup-page, use-unsaved-changes
    ├── types/
    └── test/                     setup.ts, server-only-mock.ts
```

### Architecture overview (one paragraph)

A single Next.js App Router application deployed on Vercel. Middleware (`src/proxy.ts`)
authenticates every request and gates unfinished onboarding. Signed-in pages live under the
`(app)` route group, which renders the navigation shell as a Server Component and resolves the
user's identity and pending-friend-request count once per render. Data access is
Mongoose-over-MongoDB Atlas through a module-level cached connection. AI calls go directly to
OpenRouter's HTTP API — no SDK — through a fallback chain of models. Realtime message delivery
and video both use LiveKit, with a per-user data room for message fan-out and a HTTP polling
fallback when realtime is unavailable. Abuse and cost controls all flow through one
MongoDB-backed fixed-window rate limiter.

---

## 3. Complete feature inventory

### 3.1 Authentication — Google OAuth

**Purpose.** Primary low-friction sign-in path.

**Implementation.** `src/auth.ts` configures the NextAuth `Google` provider with
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. The `signIn` callback runs on every Google login:
it rejects banned users, and if no `User` document exists it creates one with a generated unique
username derived from the email local-part (`generateUniqueUsername`, which strips
non-alphanumerics, truncates to 20 chars, then appends random 4-digit suffixes on collision,
falling back to a timestamp slice). Google users are created with `isVerified: true` and
`passwordHash: null`. If a user exists but has no `googleId`, the account is linked.

**Session.** JWT strategy (not database sessions). The `jwt` callback loads the user from
MongoDB on sign-in and on every subsequent token refresh, copying `id`, `username`, `plan`,
`role`, `onboardingCompleted`, `languageProfileComplete` and `displayName` onto the token.
`languageProfileComplete` is computed by `resolveLanguageProfileCompletion`, which also
opportunistically migrates legacy language shapes into the modern `languageProfile` subdocument.

**Production readiness.** Production Ready.

**Limitations / edge cases.**
- Because the `jwt` callback hits MongoDB on every token refresh, every page load costs a
  database read. This is the price of keeping `role` and `isBanned` fresh in the token; a ban
  takes effect on the next refresh rather than immediately.
- Account linking is by email. If someone registers with email/password and later signs in with
  Google using the same address, the accounts merge and the `googleId` is attached. This is
  intentional but means email ownership is the trust boundary.

### 3.2 Authentication — email and password

**Purpose.** Sign-in for users without Google.

**Implementation.** NextAuth `Credentials` provider in `src/auth.ts`. Registration is a separate
route (`POST /api/auth/register`) validated by `RegisterSchema` in `src/lib/validations/auth.ts`
(display name 2–50, valid email, username 3–20 matching `^[a-zA-Z0-9_]+$`, password 8–100).
Passwords are hashed with bcrypt cost 12. Email and username uniqueness are checked
individually so the error message can name the actual conflict.

**Rate limiting.** Added in phase 14 (see 3.24). Sign-in is limited per email (10 / 5 min) and
per IP (30 / 5 min); registration is limited per IP (5 / hour).

**Production readiness.** Mostly Ready — blocked only by the absence of password recovery.

**Limitations / edge cases.**
- **No self-service password reset.** A user who forgets their password cannot recover without
  an operator manually resetting it. This is the single largest user-facing gap. See 3.26.
- Registration reveals whether an email or username is taken (409 with a specific message).
  This is an intentional usability trade-off, not an oversight — but it does permit account
  enumeration. Mitigated in practice by the per-IP registration limit.
- Because the credentials provider cannot surface custom errors, a throttled sign-in is
  indistinguishable from a wrong password. Documented in code.
- `isVerified` exists on the model and is set for Google users but **is never enforced
  anywhere**. Email/password users are usable immediately.

### 3.3 Onboarding

**Purpose.** Collect the minimum needed to personalise practice, then get out of the way.

**Implementation.** Route group `(onboarding)` with five steps: `languages`, `profile`,
`interests`, `mode`, `ai-preferences`. Logic lives in `src/lib/onboarding-progress.ts`
(step order, labels, paths, completion computation, redirect building) and
`src/lib/onboarding-access.ts` (the gate consulted by middleware).

**Critical design decision.** Only **one** step is required: `languages`. Everything else is
optional and can be completed later from the dashboard card or Settings. `REQUIRED_STEPS =
["languages"]`. `STEP_ORDER` puts `languages` first specifically so that the step the app gates
on is also visibly step one. On first run, as soon as the required step is saved the user is
sent straight to `/dashboard` — reaching real practice in one screen.

**Middleware gate.** `proxy.ts` calls `getLanguageOnboardingRedirect(pathname,
languageProfileComplete, role)`. Users without a complete language profile are redirected to
`/languages` from anywhere else.

**Unsaved-changes guard.** `useUnsavedChanges(isDirty)` attaches a `beforeunload` listener.
It exposes `releaseGuard()` because a successful save marks the form clean and navigates in the
same tick — React has not re-rendered, so the listener is still attached and the browser
prompted "leave site?" on the save the user had just requested. All four onboarding steps call
`releaseGuard()` before redirecting. **This is subtle; do not remove those calls.**

**Production readiness.** Production Ready.

**Limitations / edge cases.**
- The interests taxonomy and conversation modes are static config in `src/constants/`, not
  admin-editable.
- `interests` is stored as `Record<category, string[]>` on the user; only category presence is
  used for matching and filtering, not the sub-interests.

### 3.4 AI Tutor — core

**Purpose.** The product's primary value: always-available conversation practice.

**Frontend.** `src/app/(app)/ai-practice/page.tsx` is a Server Component. It authenticates,
loads the language profile, redirects to `/languages` if incomplete, and resolves any active
tutor session — all on the server, so a returning learner lands directly in their conversation
with no flash of the setup screen. It renders `AIPracticeClient` (a Client Component) with
`profile` and `initialSession` props.

`AIPracticeClient` has two views: `setup` (choose target language from saved learning
languages, and practice mode) and `chat`. If `initialSession` is present it opens in `chat`
with the stored transcript and the session's saved language and mode.

**Backend.** `POST /api/ai-practice`. Flow:
1. `auth()` — 401 if absent.
2. Reject any request body containing forbidden fields: `model`, `provider`, `systemPrompt`,
   `system_prompt`, `modelRole`, `language`, `level`, `nativeLanguages`,
   `explanationLanguage`, `history`. **This is a prompt-injection / config-tampering guard.**
3. Validate with `aiPracticeRequestSchema`, a Zod **discriminated union on `action`**:
   - `start` requires `targetLanguageCode` (normalised, must be supported) and `mode`.
   - `message` requires `sessionId` (24-hex) and `message` (1–1000 chars).
4. For `message`, load the session via `loadOwnedTutorSession(userId, sessionId)` — which
   filters on `userId` so **one user cannot continue another's session**. Language, mode and
   history all come from the stored record, never the request.
5. Reject if the session has hit `MAX_SESSION_MESSAGES` (200) with `SESSION_LIMIT_REACHED`.
6. Resolve the language profile and build the tutor context.
7. Check the budget (see 3.7). Metered **after** validation so malformed requests never consume
   anyone's allowance.
8. Open a streaming completion and **pull the first chunk before committing to a 200**, so all
   availability failures still surface as real HTTP statuses.
9. Stream NDJSON events to the client.
10. Persist the exchange after the reply completes.

`DELETE /api/ai-practice` ends the caller's active session.

**Database.** `TutorSession` (`src/lib/models/TutorSession.ts`): `userId`,
`targetLanguageCode`, `mode`, `status` (`active` | `ended`), `messages[{role, content,
createdAt}]`, `endedAt`, timestamps. Index: `{ userId: 1, status: 1, updatedAt: -1 }` for the
resume lookup.

**Production readiness.** Production Ready in code; **blocked by provider quota** (section 5).

### 3.5 AI Tutor — model fallback chain

**Why it exists.** This was the first and most severe finding of the whole project. The tutor
returned a generic 502 to every user in production. Root cause:
`AI_MODEL_DEFAULT=google/gemini-2.5-flash` — a paid model — on an OpenRouter account that had
never purchased credits. Every request returned HTTP 402 `"Insufficient credits"`, and the
error body was discarded, so the real cause was invisible in logs.

**Implementation.** `src/lib/ai/models.ts` exposes `resolveModelChain()`, which returns
deduplicated:
1. `AI_MODEL_DEFAULT` (comma-separated list supported)
2. `AI_MODEL_FALLBACKS` (comma-separated)
3. `FREE_TUTOR_MODELS` — built-in zero-cost models

`FREE_TUTOR_MODELS` was chosen by benchmarking **all 17 free models on the live key**:
```
google/gemma-4-26b-a4b-it:free           1.7s  ← best quality/latency
nvidia/nemotron-3-super-120b-a12b:free   1.7s
google/gemma-4-31b-it:free               (rate-limited upstream at test time)
```
Rejected: `openrouter/free` (33s — far too slow), `openai/gpt-oss-20b:free` (10s).

**Advance rules** (`src/lib/ai/openrouter.ts`). `isModelUnavailable(status)` returns true for
402, 404, 429 and 5xx. Only those advance to the next model, because each fails in well under a
second so walking the chain is cheap. **Timeouts and malformed replies deliberately do NOT
advance** — the model did respond, and three chained 25-second timeouts would strand the user
for over a minute. This asymmetry is intentional and tested.

**Error codes.** `RATE_LIMIT`, `PROVIDER_ERROR`, `MALFORMED_RESPONSE`, `MISSING_CONFIG`,
`NO_CREDITS`, `TIMEOUT`. `NO_CREDITS` exists so a billing problem stops masquerading as a
provider outage.

**Logging.** Every failed attempt logs model id, status and a 400-char truncation of the
provider's error body. This is what made the original 402 diagnosable. A test asserts the API
key never appears in logs.

**Key property:** production recovers **without any environment change**. The pinned paid model
still fails first, then a free model serves the request. Verified live against the real API.

### 3.6 AI Tutor — session persistence

**Why.** A tutor conversation lived only in React state, so a reload, a dropped connection or a
device switch discarded it. Unacceptable for a learning product where the conversation *is* the
work.

**Implementation.** `src/lib/ai/tutor-session.server.ts`:
- `getActiveTutorSession(userId)` — most recently updated active session. Filters
  `'messages.0': { $exists: true }` because a session is created *before* its first reply
  streams, so one with no messages is an abandoned shell and must not be resumed.
- `startTutorSession({userId, targetLanguageCode, mode})` — ends any other active session
  first (a user has at most one resumable session), creates empty.
- `appendAssistantMessage(...)` — records the opening reply once its stream completes.
- `appendTutorExchange(...)` — appends the learner's turn and the tutor's reply atomically.
- `loadOwnedTutorSession(userId, sessionId)` — ownership-scoped load.
- `endActiveTutorSessions(userId)`.

**Bounds.** `PROVIDER_HISTORY_LIMIT = 20` — only the tail is replayed upstream, because prompt
size drives cost and a tutor does not need the start of a long session to answer the next turn.
`MAX_SESSION_MESSAGES = 200` — a session caps rather than growing one document without limit.

**The bigger win: history ownership moved to the server.** The client used to send the
transcript on every turn, so the server had to trust the caller's account of what was said.
Now `history` is a rejected field and the server replays what it recorded. Restating
`targetLanguageCode` or `mode` on a turn does nothing — an existing session cannot be redirected
to another language mid-conversation.

### 3.7 AI Tutor — cost metering

**Why.** The tutor is the only endpoint that costs money, and OpenRouter's free-tier quota is
billed **to the account, not per user**. One user or one stuck retry loop could exhaust the
shared quota in minutes and take the tutor down for everybody.

**Implementation.** `src/lib/ai/tutor-budget.ts`, three tiers:

| Tier | Key | Limit | Window |
|---|---|---|---|
| Burst | per user | 15 | 60s |
| Personal daily | per user | 80 | 24h |
| **Shared daily budget** | `all-users` | 45 (default) | 24h |

**Check ordering is load-bearing and pinned by tests.** Every check increments its own counter,
so the shared budget is consulted **last**, only after the caller clears their personal limits.
Checking it earlier would let rejected spam inflate the global counter, letting one abusive
client deny everyone — exactly what the budget prevents.

**Why 45.** OpenRouter's free tier allows **50 model requests per day for the whole account**
(`X-RateLimit-Limit: 50`, `limit_source: openrouter_free_tier_daily`). Staying just under it
means users meet the app's own clear "try again tomorrow" message instead of an opaque upstream
429 raised after three failed model attempts. **`AI_DAILY_REQUEST_BUDGET` must not be raised
without first raising the provider quota**, or the extra allowance simply fails upstream.

**Client contract.** Responses carry an explicit `retryable` flag. A burst limit clears in a
minute and keeps its Retry button; a spent daily allowance does not offer a retry guaranteed to
fail.

### 3.8 AI Tutor — streaming

**Why.** Measured from real dev-server logs, a full reply took 6–13 seconds, all of it spent
watching a spinner.

**Implementation.** `streamTutor()` in `openrouter.ts` requests `stream: true`, walks the same
model chain, and parses the provider's server-sent events into text deltas, **buffering partial
frames across network chunk boundaries** (a `data:` line can be split mid-JSON).

The route emits **newline-delimited JSON**, not raw SSE, so it can carry metadata:
```
{"type":"session","sessionId":"..."}
{"type":"delta","text":"Hola"}
{"type":"done"}
{"type":"error","error":"…","retryable":true}
```

**Critical ordering.** The route pulls the **first chunk before committing to a 200**. Every way
reaching a model can fail — no credits, rate limits, timeouts, exhausted chain — happens during
that first pull, so those arrive as ordinary HTTP errors with real statuses instead of being
buried inside a stream the client has already begun rendering. Only failures *after* text starts
become in-stream error events.

**Partial persistence.** Whatever text the learner actually saw is stored, including a partial
reply from an interrupted stream — it is already on their screen and in their context.

**Measured outcome.** 14 incremental render steps, text growing 102→173 chars between 9.1s and
12.0s. Streaming cut perceived wait from ~12s to ~9s. **The remaining 9s is time-to-first-token
from the free tier and no client work will fix it** — a paid model answers in well under a
second.

Headers include `X-Accel-Buffering: no`, because streaming is pointless if a proxy buffers the
whole response.

### 3.9 Language matching

**Purpose.** Pair users reciprocally for text or video exchange.

**Frontend.** `(app)/match/chat` and `(app)/match/video` are Server Components that read the
saved language profile and pass `resolveMatchDefaults(profile)` into `ChatMatchClient` /
`VideoMatchClient`. Clients handle queueing, 2s polling, cancellation and the match-found modal.

**Backend.** `POST /api/match/chat` and `/api/match/video`. Both validate with
`matchRequestSchema`, cancel any existing waiting request from the caller (queue-spam guard),
then attempt a reciprocal match:
```js
{ type, targetLanguage: <my native>, nativeLanguage: <my target>, status: 'waiting',
  userId: { $ne: me } }
```
Chat matching has two passes: country-preference-exact first, then any. Video matching
additionally requires the candidate to be actively polling (`lastPolledAt` within 12s, the
"ghost" threshold) and drops language filters after 5s in queue.

**Database.** `MatchRequest`: `userId`, `type`, `targetLanguage`, `nativeLanguage`, `interests`,
`countryPreference`, `status` (`waiting`|`matched`|`cancelled`), `conversationId`,
`lastPolledAt`, `createdAt` with a **900-second TTL**. Index `{type, status, lastPolledAt}`.

**Compatibility scoring.** `src/lib/matching/` defines a `CompatibilityProvider` interface with
a `RuleBasedProvider` implementation, swapped via a singleton in `index.ts`. Designed so an
AI-powered provider can replace it without touching call sites.

**THE CRITICAL BUG THAT WAS FIXED.** The match pages initialised state as
`targetLanguage = "KO"`, `nativeLanguage = "EN"` — uppercase — while `LanguageSelector` emits
the **lowercase** codes from `constants/languages.ts`, and the query uses exact string
equality. So `"EN" !== "en"` and **two perfectly reciprocal partners silently never matched.**
Reproduced with two accounts:
```
target 'en' / native 'es'  → matched: false
target 'ES' / native 'EN'  → matched: false
```
Both users simply waited forever and concluded nobody was on the platform — devastating on a
small beta where every real pair counts.

**Fix.** Normalise at the API boundary rather than trusting the client:
`src/lib/validations/match.ts` transforms via `normalizeLanguageCode`, validates against
supported codes, and rejects target == native. The same cross-case pair now matches instantly.
The match forms also seed from the saved profile instead of hard-coding Korean.

**Production readiness.** Mostly Ready. The engine is correct and verified; matching depends
on liquidity (two compatible users online simultaneously), which a small beta will not have.

**Limitations.** Fixed-window polling at 2s from the client; no push notification when a match
arrives after the user navigates away; `interests` is accepted but not used for scoring in the
current provider.

### 3.10 Friends and friend requests

**Purpose.** Persistent connections between learners.

**THE BUG THAT WAS FIXED.** This was a **broken loop, not a missing feature**. Four surfaces
let a user *send* a friend request — explore, a profile, a conversation, and a live chat
session — but the only page that *lists incoming requests* (`/friends`) was absent from every
navigation. The one other place a request could be accepted was the sender's own profile page,
which the recipient had no way to know to visit. **So A could add B, and B could never
respond.**

**Fix.** `/friends` added to the sidebar and the mobile More menu, with a pending-request count
badge. The count is read on the **server** in the `(app)` layout by
`countIncomingFriendRequests()` and passed down — the navigation needs a number, so this
projects a single field instead of `GET /api/friends`, which populates three full user lists. It
fails soft (returns 0 on error): a badge is not worth failing a page render over. Accepting or
declining calls `router.refresh()` so the badge cannot go stale.

On mobile, Friends sits in the More menu rather than the primary row — it must be reachable but
is lower-frequency than practising or messaging, and a badge on the More trigger surfaces
pending requests without spending a primary slot.

**Backend.** `GET /api/friends` returns `{friends, incoming, sent}` with populated public
fields. `POST /api/friends/request` (body: `targetUserId` — **note: not `userId`**),
`POST /api/friends/[id]/accept`, `POST /api/friends/[id]/decline`,
`DELETE /api/friends/[id]/request` (cancel sent), `DELETE /api/friends/[id]` (unfriend).

**Database.** On `User`: `friends: [ObjectId]` and `friendRequests: [{from, createdAt}]`.
Index `{'friendRequests.from': 1}` supports the reverse "who did I send to" lookup.

**Production readiness.** Production Ready. Verified end to end with two accounts: request sent,
badge appeared as 1, request listed, accepted, friend appeared, badge cleared.

**Limitations.** No blocking (only reporting and admin ban). No request expiry. The friends page
is still client-fetched behind a full-page spinner.

### 3.11 Messaging

**Purpose.** Text conversation between matched users or friends.

**Frontend.** `(app)/messages` (list) and `(app)/messages/[conversationId]` (thread, 774 lines
— the largest file in the repo). `MessengerShell` provides the two-pane layout.

**Realtime.** LiveKit data channels. `src/lib/messages/realtime.ts` publishes a
`conversation.message` event to each participant's personal room (`lm-user-<userId>`) via
`RoomService.sendData`. The client subscribes and merges.

**Polling fallback.** When realtime is disconnected **and** the session is active, the client
polls every 10 seconds. Correctly scoped — it does not poll needlessly. Intervals and
subscriptions are cleaned up.

**Message reconciliation.** `src/lib/messages/reconcile.ts` — `reconcileMessages(current,
incoming)` dedupes by stable database id and keeps chronological order, so realtime and polling
can both feed the same state safely. Unit tested.

**TWO BUGS THAT WERE FIXED (phase 18).**
1. `GET /api/chat/[sessionId]/messages` sorted **ascending** with `limit(100)`, so a request
   without a cursor returned the **first hundred messages a conversation ever had**. Any pair who
   passed 100 messages were permanently stuck looking at the beginning of their history and
   never saw another message — the conversation appeared frozen while both people kept typing.
   Fixed: without a cursor it fetches descending and reverses, returning the newest window in
   chronological order; with `?after=` the ascending order is correct and kept.
2. The polling fallback refetched that entire window every 10 seconds while **never passing the
   `after` cursor the endpoint had always supported.** Now it sends the newest message it holds.

Verified live: cursor at newest returns 0; after sending one it returns exactly 1; full fetch
grows 1→2; order stays chronological. Unit tested at 250 messages (old behaviour returned 0–99,
corrected returns 150–249).

**Database.** `Message`: `conversationId`, `senderId`, `content` (max 2000), timestamps.
Indexes: `conversationId`, `{conversationId, createdAt}`.
`Conversation`: `participants` (exactly 2, validated), `type` (`chat`|`video`), `language`,
`status` (`active`|`ended`), `livekitRoomName`, `startedAt`, `endedAt`, `durationSeconds`,
`compatibilityPct`, `typing: Map<userId, Date>`.

**Typing indicators.** `POST /api/chat/[sessionId]/typing` writes into the conversation's
`typing` map; readers treat an entry within `TYPING_TIMEOUT_MS` as active. Rate-limited 30/60s.

**Authorization.** Every conversation route verifies the caller is in `participants`. Audited
across all of them — **no IDOR found**.

**Production readiness.** Production Ready.

**Limitations.** No pagination UI for history beyond the newest 100 (the endpoint supports a
cursor forwards only, not backwards). No read receipts. No attachments. No message editing or
deletion. Polling is 10s so a realtime outage degrades to 10s latency.

### 3.12 Conversation list

`GET /api/conversations` returns the caller's conversations with partner summary, language,
status, last message and unread count. `POST /api/conversations/upsert` creates or finds a
direct conversation with a given recipient (used by "Chat" from the friends page).
`applyMessageToConversations` in `reconcile.ts` updates the preview and promotes a conversation
on a new message. **Production Ready.**

### 3.13 Notifications

**Not Implemented.** A `notifications-popover.tsx` component and a `use-notifications` hook
existed, both fed entirely by hard-coded fake data, and both were **unreferenced anywhere**.
Deleted in phase 2. A `Notification` type remains in `src/types/index.ts`, unused.

The friend-request badge is the only notification-like surface, and it is server-computed per
render rather than pushed.

### 3.14 Dashboard

**Purpose.** The signed-in home screen; route users to the practice mode that fits today.

**Implementation.** `(app)/dashboard/page.tsx`, a **Server Component**. Fetches the profile and
the progress summary in parallel, then renders: greeting with first name; the profile-completion
card; a primary AI-tutor call to action naming the actual target language; Text Practice and
Live Practice cards; a "Pick up where you left off" card showing the last session's language and
mode plus a streak badge; and three secondary links.

**It was a Client Component** that fetched `/api/user/me` in an effect, so the greeting, the
target language and the setup card all arrived after first paint and shifted the layout. Now
server-rendered — verified the initial HTML already contains the display name, username and
"Practise Spanish with your AI tutor", and the page makes **no `/api/user/me` request at all**.

**The completion card.** `src/components/profile-completion-card.tsx`. It used to greet a user
who had *just finished setup* with "Complete your profile — 20%", framing them as 80% failed at
something they had in fact completed. Since only the language step is required and the app
forces it before the dashboard is reachable, once required steps are done the card speaks about
optional extras — "Get better matches", "4 optional steps left" — and drops both the percentage
and the progress bar, because a progress bar implies a task that must be finished. Dismissal is
stored in `localStorage` keyed by completion percentage, so it reappears when progress changes.

**Production Ready.**

### 3.15 Search (navbar) and Explore

**Navbar search.** `src/components/shared/user-search.tsx`. Debounced 300ms against
`GET /api/users/search?q=&limit=8`.

Three real defects were fixed: its `SearchUser` type declared `_id` and `email`, but the
endpoint returns **neither** — so every React key was `undefined` and the second line of every
result was permanently blank where an email was meant to go. It also claimed
`role="combobox"` while being unusable as one. Now: keyed on `id`, shows display name over
username, and implements the full pattern — `aria-controls`, `aria-autocomplete="list"`, option
ids, `aria-selected`, `aria-activedescendant`, ArrowUp/ArrowDown/Enter/Escape.

Verified: `aria-controls` resolves to the listbox, all eight options carry ids and
`aria-selected`, two ArrowDown presses move `aria-activedescendant` to the second option.

**Explore.** `(app)/explore` — partner discovery with debounced text search, country filter,
language filter, interest chips, `Load more` pagination, and per-user friend-status buttons.
Backed by `GET /api/users/search` which excludes banned/inactive users and the caller, and
returns `friendStatus` computed from the caller's friends, incoming and sent requests.

**Production Ready.** Note `/api/users/search` deliberately does **not** return email.

### 3.16 Profile

`(app)/profile/[username]` — public-facing profile: avatar, display name, username, country,
bio, native and learning languages with levels, interests, and friend/chat actions.
`GET /api/users/[username]` serves it. **Production Ready.**

### 3.17 Settings

`(app)/settings` (494 lines, Client Component with tabs). Sections: profile fields, avatar
upload, language profile, AI preferences, notifications (UI only), account.

Mutations: `PATCH /api/user/me` (allow-listed fields only:
`displayName, bio, country, gender, age, timezone, avatar, interests, conversationModes,
onboardingCompleted, aiProfile`, plus `username` with a uniqueness check);
`PUT /api/user/me/language-profile`; `DELETE /api/user/me/ai-profile`;
`POST /api/upload/avatar`.

**Important:** `PATCH /api/user/me` explicitly **rejects** `nativeLanguages`,
`spokenLanguages`, `learningLanguages` with a 400 directing callers to the language-profile
endpoint. This keeps one writer for language data.

**Mostly Ready.** Limitations: still client-fetched behind a spinner; "Reset to defaults" and
"Delete my data" both call the same `DELETE /api/user/me/ai-profile` endpoint (harmless
duplication, but "Delete my data" implies more than it does); the notifications tab has no
backing preferences.

### 3.18 Subscription and billing

**Not Implemented, and deliberately not surfaced.**

`/subscription` was deleted. It presented a premium tier promising "3/day" limits, video calls,
weekly AI coaching and unlimited conversations — **none of which existed** — and directly
contradicted the landing page's own statement that paid plans are not being offered. The
sidebar's "Free" plan badge was also removed because it implied a tier system.

Remaining scaffolding, intentionally left because it is harmless and future-useful:
`plan`, `planExpiry`, `stripeCustomerId`, `dailySessionCount`, `lastSessionDate` on `User`;
the `PricingPlan` model; `/api/admin/plans`; `/api/admin/billing`; `(admin)/admin/billing`.

**User records keep their `plan` field — only the fiction was removed.** No user data was
deleted.

### 3.19 Admin console

Route group `(admin)`, gated in `proxy.ts`: any `/admin*` path with `role !== 'admin'`
redirects to `/dashboard`. Every admin API route independently re-checks the role — the
middleware gate is not the only defence.

| Page | Data source | State |
|---|---|---|
| `dashboard` | `/api/admin/stats` (real counts) + `/api/admin/reports` | Real; charts replaced with an honest "not instrumented" note |
| `reports` | `/api/admin/reports` | Real, with working actions |
| `users` | `/api/admin/users` | Real |
| `database` | `/api/admin/db` | Real, whitelisted collections |
| `sessions` | `/api/admin/db/conversations` | Real |
| `feedback` | `/api/admin/db/conversationfeedbacks` | Real |
| `files` | `/api/admin/uploads` | Real |
| `content` | `/api/admin/content` | Real (`PageContent` model) |
| `theme` | `/api/admin/theme` | Real (`ThemeSettings` model) |
| `billing` | `/api/admin/billing`, `/api/admin/plans` | Real endpoints, but no payment provider behind them |
| `analytics` | none | Honest placeholder listing planned metrics and the data each needs |
| `flags` | none | Honest placeholder (was already honest) |

**Three admin pages previously showed fabricated numbers** — daily actives, sentiment, MRR for
a product with no billing, retention risks, roadmap suggestions. All removed. An admin could
otherwise have made a decision from an invented revenue chart.

`admin/db/[collection]` allows CRUD on a **whitelist**: `users, conversations,
conversationfeedbacks, matchrequests, messages, ratelimits, reports, uploads, themesettings,
pagecontents, pricingplans`.

**Mostly Ready.** **Important caveat: four admin pages were verified only by typecheck, lint
and build.** Reaching them requires an admin account which was not available during development,
and both routes to obtaining one (a direct DB write, and using the owner's authenticated
session) were correctly blocked. **A human with admin access should click through
`billing`, `database`, `feedback` and `sessions` before relying on them.**

### 3.20 Reports and moderation

**Purpose.** Let users report bad behaviour and let admins act.

**User side.** `POST /api/reports` — rate-limited 10/hour. `Report` model: `reportedBy`,
`reportedUser`, `conversationId`, `reason` (enum: Spam, Harassment, Inappropriate Content, Fake
Profile, Other), `details` (max 1000), `status` (`open`|`reviewed`|`resolved`|`dismissed`).
Indexes: `{reportedUser, status}`, `{reportedBy, createdAt}`, `{status, createdAt}`.

**Admin side.** `GET /api/admin/reports` returns the real queue with reporter and reported
usernames populated, plus `reportedUserId` so a moderator can act on the account from the report
itself. `PATCH /api/admin/reports/[id]` moves a report to `reviewed`, `resolved` or `dismissed`
— **`open` is deliberately not settable**, because a report starts there and moderation only
moves it forward.

**A real defect fixed:** the reports page had four action buttons — Warn, Temp Ban, Perm Ban,
Dismiss — **none of which had a click handler.** An admin could press "Perm Ban" and believe a
user had been sanctioned. Now only actions with a real backend appear: Mark reviewed, Dismiss,
and Ban user (wired to `PATCH /api/admin/users/[id]` with `isBanned` + `banReason`, which also
resolves the report since banning settles it). Warn and Temp Ban were removed rather than left
as decoration.

**Ban enforcement.** `auth.ts` rejects banned users at sign-in for both providers, and
`/api/users/search` excludes them.

**Mostly Ready.** No user-facing blocking, no appeal flow, no audit trail of who took which
moderation action.

### 3.21 Rate limiting

**One shared implementation:** `src/lib/rateLimit.ts` —
`checkRateLimit(action, subject, limit, windowSecs)`. MongoDB-backed **fixed window**, keyed
`${action}:${subject}:${windowId}`. Uses `findOneAndUpdate` with `upsert` and `$inc` (atomic),
retries as a plain increment on duplicate-key races, and **fails open** on unexpected errors so
a database hiccup does not lock out legitimate users — **including a failure to connect at all**,
which until `0d8c90b` threw past the guard and turned every limited endpoint into a 500 during an
outage (11.30). Documents carry `expiresAt` set to 2× the
window with a MongoDB TTL index, so cleanup is automatic. Works across all serverless instances
because state is in the database, not memory.

**Every limit currently applied:**

| Action | Subject | Limit | Window | Purpose |
|---|---|---|---|---|
| `login-email` | hashed email | 10 | 5 min | brute force |
| `login-ip` | hashed IP | 30 | 5 min | credential stuffing |
| `register-ip` | hashed IP | 5 | 1 h | account spam, bcrypt DoS |
| `ai-tutor-burst` | userId | 15 | 60 s | runaway loops |
| `ai-tutor-day` | userId | 80 | 24 h | per-user cost |
| `ai-tutor-global` | `all-users` | 45 | 24 h | shared provider quota |
| `avatar-upload` | userId | 10 | 1 h | Cloudinary quota |
| `message` | userId | 10 | 10 s | chat spam |
| `typing` | userId | 30 | 60 s | typing-indicator spam |
| `match-queue` | userId | 5 | 60 s | chat queue spam |
| `match-queue-video` | userId | 5 | 60 s | video queue spam (added; was missing) |
| `report` | userId | 10 | 1 h | report spam |
| `client-error` | hashed IP | 30 | 5 min | browser error-report spam on a public endpoint (3.34) |

**Privacy decision.** Rate-limit keys for unauthenticated endpoints are **hashed** with the app
secret (`src/lib/request-identity.ts`, `hashSubject`). These documents persist for the length of
their window, so keying them on a raw IP or email address would mean storing personal data to
solve an abuse problem. SHA-256 of `${AUTH_SECRET}:${value.toLowerCase()}`, truncated to 32
hex chars — stable and comparable but not reversible and useless outside this deployment.

**Client IP.** `getClientIp(headers)` reads the **first** entry of `x-forwarded-for` (later
entries are proxies and must not be trusted as the origin), falling back to `x-real-ip`, then
the literal `"unknown"`.

**Production Ready.**

### 3.22 Error handling, 404 and loading states

**Before this work there were none of these files anywhere.** Visiting a removed route rendered
Next's bare white default: no branding, wrong theme, no navigation, no way back. An uncaught
server error looked the same.

**Now:**
- `src/app/not-found.tsx` — branded 404.
- `src/app/error.tsx` — root error boundary.
- `src/app/global-error.tsx` — last resort; replaces the root layout, so it defines its own
  `<html>`/`<body>` with fully inline styles and uses React's `<title>` (metadata exports are
  not supported there).
- `src/app/(app)/error.tsx` — renders **inside** the signed-in layout, so a user whose page
  broke keeps their sidebar and can navigate away instead of being stranded.
- `src/app/(app)/not-found.tsx` — in-app 404 with navigation intact.
- `src/app/(app)/loading.tsx` — streaming fallback.

All share `src/components/shared/status-screen.tsx`, so a 404 and a crash stay recognisably
part of the same product, and every one offers a way out. Only the first action is styled as
primary; the rest are outline, so alternatives do not compete with the recommended path.

**Next 16 detail:** error boundaries take **`unstable_retry`**, not `reset`. `unstable_retry`
was added in 16.2.0 and is preferred because it re-fetches rather than only re-rendering. This
was discovered by reading `node_modules/next/dist/docs/` as `AGENTS.md` instructs — training
data would have said `reset`. **Do not "fix" this back to `reset`.**

Error screens surface `error.digest`, not the raw message: enough to match a user report to a
server log without leaking internals.

Verified by temporarily adding a route that throws during server render, watching the boundary
catch it with navigation intact and a digest shown, then removing the route.

**Production Ready.**

### 3.23 Accessibility

**Completed.** Semantic landmarks and headings throughout; `aria-labelledby` on dashboard
sections; `role="status"` with `aria-label` on loading indicators; `role="alert"` on error
panels; labelled form controls; the navbar search implements the full combobox pattern with
keyboard navigation; `FlagImage` is decorative by default (empty `alt`) because adjacent text
always names the language or country; the sidebar friend badge is duplicated onto the collapsed
rail where labels are hidden.

**Lint is clean of accessibility warnings.** `jsx-a11y` rules from `eslint-config-next` pass.

**Needs Work.** Not audited: full keyboard traversal of the video session controls; colour
contrast measurement in light theme; screen-reader testing of the streaming tutor transcript
(new text arrives without an `aria-live` region, so a screen reader user is not told the reply
is arriving); focus management when dialogs open and close.

### 3.24 Live video and pre-join

**Purpose.** Optional face-to-face practice.

**Stack.** LiveKit. `src/lib/livekit.ts` wraps `livekit-server-sdk`
(`getRoomService`, `createRoom`, token minting). Client uses
`@livekit/components-react` + `livekit-client`.

**Endpoints.** `GET /api/session/[id]/token` — mints a room token after verifying the caller
participates in that conversation and the conversation is of type `video`.
`GET /api/realtime/token?room=` — mints a **data-only** token for the personal message room
(`canPublish: false`, `canPublishData: false`, `canSubscribe: true`). Verified live: returns a
valid JWT.
`POST /api/session/[id]/end` — ends a session, records `durationSeconds`.

**Pre-join.** `src/components/session/PreJoinScreen.tsx` — camera and mic toggles with live
preview before matching. **Two real bugs were fixed here:**
1. It assigned `videoRef.current.srcObject` in the same tick it flipped the state that renders
   the `<video>` element, so the ref was still `null` and the assignment silently did nothing —
   **the camera preview could never appear.** Attaching the stream now happens in its own
   effect, after the element mounts.
2. `getUserMedia` results were dropped if the user toggled the camera off or navigated away
   while the request was in flight, **leaving the camera light on with no way to turn it off** —
   a privacy problem, not a tidiness one. The stream is now owned by one effect whose cleanup
   always releases it, with a `cancelled` flag covering late resolutions.

**Not Implemented / unverified.** **An actual two-participant video call was never exercised** —
no second camera was available. Token minting, room creation and the pre-join screen are
verified; the call itself is not. `voiceIntro` exists on the user model and is unused.

### 3.25 Cloudinary and avatar upload

`src/lib/cloudinary.ts` configures the SDK from `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

`POST /api/upload/avatar`: authenticates, rate-limits (10/hour — every accepted upload spends
third-party quota, metered for the same reason the tutor is), rejects non-`image/*` and files
over 2MB, uploads via `upload_stream` to `lingomatch/avatars` with `resource_type: 'image'`,
sets `User.avatar`, and records an `Upload` document.

Admin file management: `GET/POST /api/admin/uploads`, `DELETE /api/admin/uploads/[id]`.

**Mostly Ready.** Two known issues: MIME type comes from the client and is spoofable (mitigated
because Cloudinary's `resource_type: 'image'` validates server-side and rejects non-images); and
**old avatars are never deleted from Cloudinary on replacement** — a slow storage-cost leak,
with `Upload` records accumulating alongside.

### 3.26 Password reset and email verification

**Not Implemented. This is the most important gap after the AI quota.**

**The app has no email capability whatsoever** — no mail library, no provider, no configuration.

`/forgot-password` previously showed an email field and a "Send reset link" button that was a
`<Link href="/login">`: no submit handler, no endpoint, nothing sent. A user was told a reset
link was on its way and then silently returned to the sign-in screen.

`/verify-email` stated "We sent a verification link to your inbox" and offered a "Resend
verification email" button with no handler. Nothing had been sent, registration never gated on
verification, and `isVerified` is set but never checked. **It was deleted** along with its entry
in the middleware's public paths, and now 404s.

`/forgot-password` **was kept** because password recovery is a real need and that URL is where
people will look — but it now says what is true: self-service reset is not available yet, and
Google accounts do not need a password at all. Sign-in gained a "Forgot password?" link, because
someone who cannot get in should learn their options rather than retrying forever.

**Consequence:** a user who registered with email/password and forgets it **cannot recover
without an operator manually resetting the hash.** Fixing this requires an email provider —
external credentials, possibly cost — which is an owner decision.

### 3.27 Progress and practice history

**Purpose.** Show a learner what they have actually done.

**Why it exists now.** Progress was a permanently empty nav destination that said tracking was
not active and listed metrics that might arrive one day. Honest when written — but persisting
tutor sessions (3.6) created the data it needed, so the facts changed.

**Implementation.** `src/lib/progress.server.ts` → `getProgressSummary(userId)` returns
practice-session counts (tutor and partner), message totals, distinct languages, days practised,
current streak, and a recent-practice list.

**Performance.** Deliberately built from aggregations and bounded queries, because this runs on
the two most-visited pages and a learner with hundreds of sessions should not cost more to serve
than a new one: `countDocuments` for totals; a **single aggregation** (`$sum` of `$size` of
`messages`) for the message total instead of fetching transcripts; `distinct` for languages;
`limit` on the recent list; and the streak query scoped to the 30 days it actually looks back,
which bounds the only remaining document scan.

**Streak rule.** Consecutive days ending today **or yesterday** — a streak should not read as
broken merely because the user has not practised yet on the day they open the page. Bounded at
30 days so a long history cannot walk back indefinitely. Unit tested including gap, expiry,
duplicate-day and long-history cases.

**Honesty detail.** The messages figure spells out its two halves rather than showing one total,
because they count different things: a tutor session stores **both sides** of the transcript,
while partner messages are only the ones **this user sent**. Presenting them as one number would
have been exactly the kind of quietly-wrong figure this project spent several phases removing.
"Days practised" says "in the last 30 days" because that is the window.

Verified against a real account: 7 sessions (5 tutor, 2 partner), 10 messages, 2 days practised,
2-day streak, Spanish listed, recent rows rendering both kinds.

**Production Ready.**

### 3.28 Languages, CEFR and flags

`src/constants/languages.ts` (237 lines) is the single registry: 74 languages with lowercase
BCP-47/ISO-639-1 codes, English name, native name and a flag emoji. Helpers: `getLanguage`,
`getLanguages`, `searchLanguages` (name, native name, code prefix, aliases),
`formatLanguageFull`, `formatLevel`, `formatLevelWithMeaning`, `migrateLegacyLevel`.

**Levels.** `SPOKEN_LEVELS = ["native","other"]` — spoken languages deliberately do **not** use
CEFR. `LEARNING_LEVELS = ["unsure","a1","a2","b1","b2","c1","c2"]`, stored lowercase.

**CEFR clarity.** The level dropdown offered bare "A1"…"C2" — meaningless to a learner who has
not met the framework, and this is the *first* question the app asks. Pickers now show
`formatLevelWithMeaning`: "A1 · Beginner", "B2 · Upper intermediate". Compact badges keep the
short code, where space is tight and the picker has already taught the meaning. A duplicate,
unused copy of CEFR labels in `config/ai-practice.ts` was deleted rather than left to drift.

**Legacy migration.** `migrateLegacyLevel` maps pre-CEFR values stored by earlier versions:
`beginner→unsure`, `intermediate→b1`, `advanced→c1`. Applied on read in
`user-profile.server.ts` and in several display paths. **Do not remove — old documents still
carry those values.**

**Flags render as images, not emoji.** Windows ships no country glyphs in Segoe UI Emoji, so 🇬🇧
fell back to its bare regional-indicator letters and a badge read **"GB English"** instead of
showing a flag. The country selector had already solved this by mapping the emoji to a flag CDN;
that approach was extracted as `src/components/shared/flag-image.tsx` and adopted everywhere.
It derives the ISO code from the emoji code points and loads `https://flagcdn.com/w20/<iso>.png`.

**One deliberate exception:** a native `<option>` can only contain text, so the language filter
in Explore lists names alone. Putting an `<img>` there caused a hydration error — **do not
"restore" flags to `<option>` elements.**

### 3.29 Theme

`next-themes` with `attribute="class"`, `defaultTheme="dark"`, system detection enabled.
`ThemeToggle` in the navbar. An admin-editable `ThemeSettings` model with
`GET/PUT /api/admin/theme`. The `(app)` layout reads it through `getAppTheme` and renders the
variables into the HTML; there is no public theme endpoint and nothing applies it client-side.
**Mostly Ready** — functional, not deeply tested across both themes.

### 3.30 Branding

`src/components/shared/brand-mark.tsx` is the single definition of the LingoMatch mark. It was
inlined in **six** places and the app sidebar had drifted to a different glyph from the landing,
auth and onboarding headers — so the logo changed as a user moved from signing up into the
product. Unified on the majority mark (a microphone) rather than imposing a rebrand. Swapping
the glyph is now a one-line change.

### 3.31 Page content management

`PageContent` model with `GET/POST /api/admin/content` and
`GET/PATCH/DELETE /api/admin/content/[slug]`, surfaced at `(admin)/admin/content`. Allows
editing marketing copy by slug. **Mostly Ready**, lightly used — the landing page does not
currently read from it.

### 3.32 Conversation feedback

`ConversationFeedback` model; `POST /api/chat/[sessionId]/feedback` collects a rating after a
session ends; surfaced at `(admin)/admin/feedback` reading real data. **Mostly Ready.**

### 3.33 Presence

`POST /api/user/me/presence` updates `lastSeenAt`. Used for online indicators.
**Mostly Ready** — no heartbeat interval is configured anywhere, so `lastSeenAt` updates are
sparse.

### 3.34 Error reporting and observability

**Purpose.** Make a failure in production findable. Added in `0d8c90b`.

**The problem it solves.** Error handling (3.22) was already good: a user saw a branded screen
and a `Reference:` digest. But **nothing wrote that digest anywhere searchable**, so a user
quoting it matched nothing. API handlers logged a scope tag and returned a bare
`Internal server error` with no identifier, so "it failed at about 3pm" could not be turned into
a request. Browser crashes left **no trace at all** — the user saw a broken screen while the
server saw a perfectly successful render.

**The record.** One structured line per failure, prefixed `lm-error`, built by
`src/lib/observability/error-report.ts` (pure, unit tested):

```
lm-error {"id":"7da63a08f1f4","at":"…","origin":"server","scope":"render /dashboard",
          "name":"Error","message":"…","stack":"…","digest":"104943454",
          "path":"/dashboard","method":"GET","headers":{"user-agent":"…"}}
```

Deliberately **one line**: a raw stack spans dozens, and log platforms treat each as a separate
record, which separates the interesting frames from the id identifying them.

**Where reports come from.**

| Source | File | Covers |
|---|---|---|
| `onRequestError` | `src/instrumentation.ts` | Server Component renders, Server Actions, uncaught route throws, proxy failures — everything that produces a digest |
| `internalErrorResponse` | route handlers | errors a handler catches itself and answers with a 500 |
| `reportServerError` | `friend-requests.server.ts`, `theme.server.ts`, streaming tutor paths | soft-fail paths that return a fallback and used to swallow the cause entirely |
| window listeners | `src/instrumentation-client.ts` | uncaught browser errors and unhandled rejections, registered **before hydration** so a hydration failure is caught |
| error boundaries | `error.tsx`, `(app)/error.tsx`, `global-error.tsx` | React render failures **only when there is no digest** |

**The correlation id is the point.** `internalErrorResponse` returns the same id to the caller as
`errorId`, and the error screens already show it as `Reference:`. Both now match a log line.

**Why boundaries only report digest-less errors.** A digest means the server already reported it
through `onRequestError`; reporting again would double every server-side failure. An error
without one happened in the browser and reaches the server no other way.

**Sinks.** stdout, always — Vercel captures it with no account, no key and no cost. Optionally
`ERROR_REPORT_WEBHOOK_URL` forwards the identical payload to any JSON endpoint (a Slack or
Discord incoming webhook, or a hosted tracker). Delivery goes through `after()` so it never
delays a response, falls back to a floating promise outside a request scope, and never throws.
**No SDK and no provider account is required to run the app** — that was a deliberate choice, not
a shortcut (see 11.27).

**Redaction, in `redactSecrets`.** Messages and stacks are stripped of MongoDB connection
credentials, bearer tokens, provider api keys, and the values of this deployment's own secrets.
This is not theoretical: **a Mongoose connection failure quotes the whole connection string,
password included**, and that is precisely the error most likely to be logged. Headers are
**allow-listed** (`user-agent`, `referer`, `accept-language`, `content-type`, `x-vercel-id`)
rather than filtered, because an allow-list cannot be defeated by a header nobody anticipated.
**The client address is dropped entirely** — it identifies a person, and rate limiting already
keys on a hash of it for that reason (3.21).

**The ingest endpoint.** `POST /api/observability/client-error`, validated by
`clientErrorReportSchema`. Public on purpose: the landing page, sign-in form and onboarding steps
are where a broken build hurts most and nobody is authenticated there — so `/api/observability`
was added to the middleware's public prefixes, otherwise every such report would have been
redirected to `/login` and lost. Bounded on every axis: at most **5 reports per page load** from
the browser, **30 per address per 5 minutes** at the endpoint (`client-error` action, hashed IP
subject), bodies over **16KB** refused, every schema field length-capped. Cross-origin
`"Script error."` noise — which identifies nothing and usually comes from a browser extension —
is dropped before it is sent.

**Production Ready.** Verified live end to end; see section 14.

### 3.35 Content Security Policy and security headers

**Purpose.** Roadmap item #9 (section 12). Harden against XSS/clickjacking/MIME-sniffing before
wider testing, without breaking the third-party integrations the app actually depends on.

**Implementation.** `next.config.ts` → `headers()`, applied to every path (`source: '/(.*)'`).
No nonces: nonces would force every page into dynamic rendering, which conflicts with the
deliberately cached site palette (`getAppTheme`, section 4 "Caching") and with static
optimisation generally, for a security gain this app's threat model doesn't need yet. This
follows the "Without Nonces" pattern documented in `node_modules/next/dist/docs/01-app/02-guides/
content-security-policy.md`, per `AGENTS.md`.

**CSP directives and why each origin is there:**
- `script-src`/`style-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` only when
  `NODE_ENV === 'development'`, for React's dev error reconstruction). `'unsafe-inline'` on
  `style-src` is required by the inline `<style id="app-theme-vars">` tag in `(app)/layout.tsx`
  (3.29) — there is exactly one inline style source in the app and it's server-rendered, not
  user-controlled.
- `img-src` allows `res.cloudinary.com`, `lh3.googleusercontent.com`, `flagcdn.com` — all three
  are loaded via plain `<img>` tags (Base UI's `Avatar.Image`, `FlagImage`), **not**
  `next/image`, so the browser fetches them directly rather than through `/_next/image`.
- `connect-src` allows `wss://*.livekit.cloud` and `https://*.livekit.cloud` — the only two
  origins the browser talks to directly rather than through a Route Handler (video session
  signaling and the per-user realtime-message data room, 3.11/3.24). Every other network call
  the client makes is same-origin.
- `form-action 'self' https://accounts.google.com` — the Google sign-in button
  (`signIn("google", …)`) submits a same-origin form that Auth.js then redirects cross-origin to
  Google's login page; `accounts.google.com` is allow-listed in case a browser enforces
  `form-action` against the post-redirect target, not just the initial submission.
- `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`.

**Other headers added:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`
(redundant with `frame-ancestors`, kept for older browsers), `Referrer-Policy:
strict-origin-when-cross-origin`, `X-DNS-Prefetch-Control: on`, `Strict-Transport-Security:
max-age=63072000; includeSubDomains` (**no `preload`** — that requires submission to browsers'
HSTS preload list and is effectively permanent; not this block's call to make), and
`Permissions-Policy: camera=(self), microphone=(self), geolocation=(), browsing-topics=()` —
camera/microphone stay enabled for `self` because the pre-join screen and video sessions need
`getUserMedia` (3.24); disabling them entirely, which several copy-pasted CSP examples do by
default, would silently break live video.

**Verified live**, not just built:
- `npm run build` compiles cleanly with the new headers; `curl -i` against a running dev server
  confirms every header is present on both HTML and JSON responses.
- No CSP violation ever appeared in the browser console across dashboard, explore, friends,
  settings, progress, messages and the onboarding `languages` page.
- A raw `new WebSocket('wss://<project>.livekit.cloud/rtc')` opened from the page (no token)
  reached the server and was rejected with `HTTP Authentication failed; no valid credentials
  available` — a LiveKit-level auth rejection, not a CSP block. This is the deliberate way to
  tell the two apart: a CSP block throws synchronously and logs "Refused to connect"; an allowed
  but unauthenticated connection reaches the remote server and fails there instead.
- `Image()` loads against `flagcdn.com` and `res.cloudinary.com` both resolved (`ok: true`).
- The real Google avatar (`lh3.googleusercontent.com`) loaded in the running app (200).

**Production Ready.**

*Never revert:* do not set `Permissions-Policy` to `camera=(), microphone=()` — several public
CSP examples do this by default and it would silently break the pre-join camera preview and
video sessions (3.24). Do not add nonces without first re-deciding the caching trade-off in
section 4. Do not add `preload` to the HSTS header without the owner's explicit sign-off.

### 3.36 User blocking and moderation audit trail

**Purpose.** Roadmap item #17, re-prioritised upward by the voice-first direction (18.5): a
live voice conversation cannot be reviewed after the fact the way a text transcript can, so
safety has to be preventive (who can reach whom at all) rather than only retrospective (review a
report after it's filed). This block does not touch voice — it closes the gap that would make
shipping voice-as-primary irresponsible later: **users could not stop an unwanted contact from
reaching them, and admins had no record of who took which moderation action** (former debt 9.20).

**Blocking.** `User.blockedUsers: [ObjectId]` (`src/lib/models/User.ts`), one-directional to set
— only the blocker's document changes — but enforced two-directionally everywhere it matters,
via `isBlockedEitherWay` / `getBlockedUserIds` in `src/lib/blocking.server.ts`. A blocked user
must not be able to reach the person who blocked them just because they didn't block back.

- `POST /api/users/block` / `DELETE /api/users/block` — **body-based** (`{ targetUserId }`),
  not `/api/users/[id]/block`. The first attempt at a path-based route broke `next dev` outright
  with `Error: You cannot use different slug names for the same dynamic path ('id' !==
  'username')` — Next's App Router requires every dynamic segment at one path level to share a
  slug name, and `src/app/api/users/[username]/route.ts` already owns that level. Notably, the
  production build did **not** catch this — it listed the conflicting route in its output with
  no error, and only `next dev`'s Turbopack router failed on first request. **Do not trust a
  clean `npm run build` alone to prove a new dynamic route is safe; start the dev server too.**
  The fix follows the existing `/api/friends/request` convention (also body-based) rather than
  fighting the router over segment naming.
- `blockUser()` clears the friendship and any pending friend request **both ways** — staying
  "friends" with someone you just blocked is incoherent — but leaves existing messages and
  conversation history alone; blocking stops future contact, it doesn't rewrite the past.
- Enforced at every point two people can reach each other: `POST /api/friends/request` (403),
  `POST /api/conversations/upsert` (403), `POST /api/chat/[sessionId]/messages` on an existing
  conversation (403), `GET /api/users/search` (excluded from results, both directions), and the
  matching queries in `POST /api/match/chat` and `POST`/`GET /api/match/video` (`$nin` against
  `getBlockedUserIds`, all three query sites: chat's `tryMatch`, video's initial match, and
  video's 5-second language-agnostic fallback). `GET /api/users/[username]` returns
  `isBlockedByMe` / `isBlockedByThem` so the profile page can hide Add Friend/Message and offer
  Block or Unblock correctly in either direction.
- **UI.** `(app)/profile/[username]/page.tsx` — a Block icon button next to Message when neither
  side has blocked the other, an Unblock button when I blocked them, and nothing (no dangling
  friend/message actions) when either direction is blocked.

**Moderation audit trail.** `ModerationAction` (`src/lib/models/ModerationAction.ts`):
`actorId`/`actorUsername`, `action` (`ban`|`unban`|`report_reviewed`|`report_resolved`|
`report_dismissed`), `targetUserId`/`targetUsername`, `reason`, optional `reportId`, `createdAt`.
**Append-only by convention** — no route updates or deletes a row, and the collection is
deliberately **absent** from the `admin/db/[collection]` CRUD whitelist (3.19) so the generic
admin database editor can't rewrite it either. An audit trail an admin can edit isn't an audit
trail.

`recordModerationAction()` (`src/lib/moderation.server.ts`) is called from `PATCH
/api/admin/users/[id]` when `isBanned` actually changes (the prior value is read before the
update so a ban and an unban are told apart, and a PATCH that leaves `isBanned` unchanged logs
nothing) and from `PATCH /api/admin/reports/[id]` on every status transition. Unlike error
reporting (`reportServerError`, which fires via `after()` so a slow webhook never delays a
response), this write is **awaited** — it is the record itself, not a secondary trace of one, so
it has to exist before the admin action is considered done. It still fails soft: if the insert
throws, the ban or report update that already succeeded is not undone, and the gap is reported
through `reportServerError` so it's still visible in the logs even though the audit row is
missing.

Surfaced read-only at `GET /api/admin/moderation-actions` (admin-only, paginated, newest first)
and a new **Audit log** tab on `(admin)/admin/reports/page.tsx`, alongside the existing
open/reviewed/resolved/dismissed tabs. No edit controls, matching 11.2's standing rule against
decorative or fabricated admin controls.

**Verification.** 10 new unit tests (`blocking.server.test.ts`, `moderation.server.test.ts`)
covering the union/dedup logic, the friendship-clearing side effects, username resolution, and
the fail-soft path when the audit write itself throws — mocked the same way `rateLimit.test.ts`
mocks its model, since these are I/O-shaped functions rather than pure logic. **Driven live**
against the two existing QA accounts (`qaftue001`/`qaphase001`, section 17) via a scripted
credentials sign-in, across two passes (the second added at final review, once it was noticed
the first pass never exercised matching): baseline confirmed they start as friends; A blocking B
immediately returned 403 on a fresh friend request **in both directions**, 403 on opening a chat
**in both directions**, and excluded each other from search (0 results where there had been ≥1);
the profile endpoint reported `isBlockedByMe: true` / `isBlockedByThem: false` correctly from A's
side. **Matching** — the one enforcement point the first pass had skipped — was then verified
directly: with a fresh, previously-unused reciprocal language pair queued on both sides, a
genuinely reciprocal pair matched instantly while unblocked (`matched:true`), then the identical
shape with a different fresh pair produced `matched:false` on both `POST`/`GET /api/match/chat`
and `POST /api/match/video` once A had blocked B — confirming exclusion holds at all three query
sites (chat's `tryMatch`, video's initial match, video's fallback), not just the two that were
convenient to reach through the UI-facing endpoints. Unblocking restored the ability to
re-friend; the friendship was explicitly restored afterward (and re-restored after the matching
pass re-broke it, since blocking clears friendship as designed) so the QA accounts are unchanged
for future verification runs. Separately confirmed `GET /api/admin/moderation-actions` returns
403 to a signed-in non-admin session, matching the existing pattern for the other admin endpoints
(section 6).

**Not verified live: the admin-side write path itself** (an actual ban or report-status change
producing a `ModerationAction` row, and the Audit log tab rendering it). Reaching it needs an
admin account, which — as recorded in section 17 — was not available during this block for the
same reason it wasn't during the original admin work: promoting an account requires either a
direct database write or the owner's authenticated session, and both were correctly out of
reach. This is a genuine access limitation, not a skipped step; it is the same gap already
tracked as roadmap #3 ("promote one account to admin and click through every admin page"), and
the Audit log tab should be exercised in that same pass.

**Production readiness.** Mostly Ready. Blocking is fully implemented and verified live
end-to-end. The audit trail is implemented, unit tested, and matches the codebase's established
patterns closely enough to trust, but — like four other admin pages before it (3.19) — its
write path has only been exercised through code review and tests, not a real admin session.

### Frontend

Next.js App Router with React Server Components as the default and Client Components only where
interaction demands it.

**Route groups** carry layout and access semantics:
- `(auth)` — centred card layout, public.
- `(onboarding)` — minimal header, gated to signed-in users with incomplete setup.
- `(app)` — full shell (sidebar + navbar + mobile nav), signed-in.
- `(admin)` — admin shell, role-gated.
- `session/` — standalone full-bleed video/chat shells with **no** app chrome, because a call
  should not compete with navigation.

**Server-first data flow.** The `(app)` layout is a Server Component that resolves the session
once and passes a `NavIdentity` down to the sidebar, navbar and mobile nav. Those used to read
`useSession()`, which is empty on first render, so every page briefly announced "User" and
"@me" before correcting itself. **Do not reintroduce `useSession()` in the navigation.**

**Why Server Components.** Removes fetch waterfalls, eliminates hydration flashes of wrong
data, and keeps secrets server-side. The dashboard, progress, ai-practice and both match pages
were all converted from client-fetching to server-rendering, each with measurable improvement.

**Styling.** Tailwind v4 with CSS custom properties for theme tokens
(`var(--primary)`, `var(--popover)`, …), so light/dark works without duplicated class sets.

**Component primitives.** Local `src/components/ui/` in the shadcn style, built on Base UI.
Base UI's composition API uses `render={<Link/>}` plus `nativeButton={false}` to make a Button
render as an anchor — **this is the correct idiom in this codebase; a previous commit
(`5a7b136`) fixed semantics warnings by adopting it.**

### Backend

Next.js Route Handlers under `src/app/api/`. 50 handlers. Conventions:
1. `auth()` first; 401 if absent.
2. Zod validation where a body is accepted.
3. Ownership/participation check before touching a resource.
4. Rate limit where abuse or cost is possible.
5. Typed JSON response with a machine-readable `code` on errors.

No separate service layer: handlers call `src/lib/*` helpers directly. For an application of
this size that is the right amount of structure.

### Database

MongoDB Atlas via Mongoose. `src/lib/db.ts` caches the connection on `global.mongoose` so
serverless invocations reuse it, and **clears the cached promise on failure** — without that,
every later request would await the same rejected connection and fail instantly forever.

**Connection timeouts** (added phase 14): `serverSelectionTimeoutMS: 10_000`,
`connectTimeoutMS: 10_000`, `socketTimeoutMS: 45_000`. Before these, **one register request was
observed taking 13.2 minutes in application code** after the network dropped and recovered. On
Vercel that consumes the entire function budget and returns nothing useful. Failing in seconds
lets the error boundaries show something real.

`dns.setServers(['8.8.8.8','8.8.4.4'])` is set before connecting — this predates the current
work and appears to be a workaround for local DNS resolution of Atlas SRV records. It is a
plausible contributor to the 13-minute stall. **Worth revisiting, but do not remove it blindly
— it may be load-bearing on the owner's network.**

**Twelve models.** `User` (large: identity, languages, interests, AI profile, plan, moderation,
friends), `Conversation`, `Message`, `TutorSession`, `MatchRequest`, `RateLimit`, `Report`,
`ConversationFeedback`, `Upload`, `PricingPlan`, `PageContent`, `ThemeSettings`.

**Why Mongoose.** Already in place; the flexible document shape genuinely suits a user profile
that gained a nested `languageProfile` while older documents kept flat arrays — the migration
was additive and readable rather than a schema change.

### Authentication

Auth.js v5 (beta), JWT strategy, two providers. Middleware in `src/proxy.ts` (Next 16 renamed
`middleware.ts` → `proxy.ts`) wraps `auth()` and enforces:
- public paths: `/`, `/login`, `/register`, `/forgot-password`, and anything under `/api/auth`
- unauthenticated + non-public → `/login`
- authenticated on `/login` or `/register` → `/dashboard`
- `/admin*` without `role === 'admin'` → `/dashboard`
- authenticated with incomplete language profile → the outstanding onboarding step

Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, `public`.

### AI

**Direct HTTP to OpenRouter. No SDK, deliberately.** The integration needs three things — a
model chain with custom advance rules, SSE parsing, and precise error classification — and an
SDK would have abstracted exactly those away. It is ~200 lines and fully tested (32 tests).

`buildSystemPrompt` (`src/lib/ai/prompts.ts`) composes the tutor persona from target language,
level, mode, native languages and explanation language. `buildTutorContext` maps a stored
language profile onto that, translating codes to display names and `unsure` to a distinct level.

### Matching

Provider pattern: `CompatibilityProvider` interface, `RuleBasedProvider` implementation,
singleton swap in `src/lib/matching/index.ts`. Deliberately abstracted so AI-powered matching
can replace rules without touching call sites. Queue state lives in `MatchRequest` with a
15-minute TTL and a 12-second "still polling" liveness threshold.

### Messaging

Push via LiveKit data channels to per-user rooms; HTTP polling fallback at 10s only when
realtime is down and the session is active. Client-side merge via `reconcileMessages` (dedupe by
id, chronological) so both transports can feed one state safely.

**Why LiveKit for text.** It was already a dependency for video, so message fan-out reuses the
same infrastructure rather than adding a second realtime service. Trade-off: text delivery is
coupled to LiveKit availability — hence the polling fallback.

### Video

LiveKit rooms per conversation, tokens minted server-side after participation checks. Client
uses the official React components.

### Storage

Cloudinary for avatars. Chosen because it was already configured; handles transformation and
CDN delivery without an image pipeline. Flag images come from `flagcdn.com`.

### Deployment

Vercel. Project name is **`voxa`** (the local directory is `LingoMatch` — they differ). A
`.vercel` directory is present. Node 24 LTS, Fluid Compute defaults, 300s function timeout.

### Caching

Minimal and deliberate. No `use cache` / Cache Components adoption. Reasons: nearly every page
is per-user and session-dependent, so cache keys would be per-user anyway; and correctness was
the priority while fabricated data and broken flows were being removed. Streaming responses set
`Cache-Control: no-store`.

The single exception is the site palette, which is global and rarely changes: `getAppTheme`
caches it with `unstable_cache` under the `app-theme` tag, and the admin theme route
invalidates that tag on save (see 11.25).

### Error handling

Three layers: typed API error codes; React error boundaries at root, `(app)` and global scope;
and fail-soft helpers where a subsystem failing should not fail a page (the friend badge count
returns 0 on error; the rate limiter fails open).

### State management

No global state library. Server Components hold server data; `useState`/`useRef` hold local UI
state; `next-auth`'s `SessionProvider` supplies the client session (needed for `signOut`);
`localStorage` persists the profile-card dismissal. For an app of this shape, adding Redux or
Zustand would be pure overhead.

### Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `MONGODB_URI` | Atlas connection string | Yes |
| `AUTH_SECRET` | Auth.js signing secret; also salts rate-limit hashes | Yes |
| `AUTH_URL` | Canonical app URL for Auth.js | Yes |
| `NEXTAUTH_SECRET` | Legacy alias, still present | Effectively yes |
| `NEXTAUTH_URL` | Legacy alias, still present | Effectively yes |
| `GOOGLE_CLIENT_ID` | Google OAuth | Yes for Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | Yes for Google login |
| `OPENROUTER_API_KEY` | AI tutor | Yes for tutor |
| `AI_MODEL_DEFAULT` | Preferred model, comma-separated allowed | No (falls back to free chain) |
| `AI_MODEL_FALLBACKS` | Extra fallbacks before built-ins | No |
| `AI_DAILY_REQUEST_BUDGET` | Shared daily tutor budget | No (default 45) |
| `CLOUDINARY_CLOUD_NAME` | Avatar storage | Yes for uploads |
| `CLOUDINARY_API_KEY` | Avatar storage | Yes for uploads |
| `CLOUDINARY_API_SECRET` | Avatar storage | Yes for uploads |
| `LIVEKIT_URL` | Server-side LiveKit | Yes for video/realtime |
| `LIVEKIT_API_KEY` | Server-side LiveKit | Yes |
| `LIVEKIT_API_SECRET` | Server-side LiveKit | Yes |
| `NEXT_PUBLIC_LIVEKIT_URL` | Client-side LiveKit | Yes for video |

Both `AUTH_*` and `NEXTAUTH_*` are present because Auth.js v5 renamed them and the older names
were never removed. Keep both until verified unnecessary in production.

### Third-party services

| Service | Role | Failure mode |
|---|---|---|
| MongoDB Atlas (M0 free) | All persistence | App-wide outage |
| OpenRouter | AI tutor | Tutor unavailable; chain + budget degrade gracefully |
| Cloudinary | Avatars | Upload fails; existing avatars keep serving |
| LiveKit | Video + realtime text | Video unavailable; text falls back to polling |
| flagcdn.com | Flag images | Flags render as nothing (`alt=""`) |
| Google OAuth | Sign-in | Google login unavailable; credentials still work |

---

## 5. Infrastructure

### MongoDB

Atlas, currently the free M0 tier. Connection string form:
```
mongodb+srv://<user>:<pass>@cluster0.jnbqwej.mongodb.net/test?appName=Cluster0
```

**⚠️ THE DATABASE IS NAMED `test` AND IS SHARED BETWEEN DEVELOPMENT AND PRODUCTION.**

This is the most significant infrastructure problem. Local development writes into the same
database production reads. It is why test accounts (`test`, `testuser1`, `testuser2`,
`testaasdasd`, `chrometest2`, `testuser_lm`) are visible in Explore alongside real users.

**Why it was not fixed:** changing the database name points the app at an empty database and
cuts off every existing user. That is a migration requiring the owner's decision, and one of the
explicit stop conditions for this work. Atlas allows additional databases on the same free
cluster at no extra cost, so the fix is cheap — it just needs a decision and a data move.

Indexes are declared in the models and created by Mongoose on first use. No migration framework
— schema evolution is handled by additive fields plus read-time migration
(`applyProfileMigrations`, `migrateLegacyLevel`, `resolveLanguageProfile`).

### OpenRouter

**⚠️ HARD BLOCKER FOR PUBLIC BETA.**

The account has **never purchased credits**. Consequences:
- All paid models return HTTP 402 `"Insufficient credits"`.
- Free models work but the account is capped at **50 model requests per day, total, across all
  users** (`X-RateLimit-Limit: 50`, `limit_source: openrouter_free_tier_daily`).
- Time-to-first-token on free models is ~9 seconds because free-tier requests queue.

With 21 existing accounts that is roughly two tutor messages each per day.

**Purchasing ~$10 of credits raises the cap to 1000 requests/day and drops
time-to-first-token to well under a second.** This is the single highest-value action available
and requires the owner to spend money.

After adding credits: set `AI_MODEL_DEFAULT` to a paid model (e.g. `google/gemini-2.5-flash`)
and raise `AI_DAILY_REQUEST_BUDGET` from 45 toward the new provider ceiling. The fallback chain
means neither step is urgent — the app keeps working either way.

`scripts/verify-openrouter.mjs` exists for checking key/model configuration.

### Cloudinary

Folder `lingomatch/avatars`, `resource_type: 'image'`, 2MB cap enforced in the route, 10
uploads/hour/user. **Old assets are never deleted on replacement** — storage grows monotonically.

### LiveKit

Two token scopes: full room tokens for video conversations (participation-checked), and
data-only tokens for per-user message rooms named `lm-user-<userId>` with `canPublish: false`
and `canPublishData: false` — a client can receive fan-out but cannot publish into anyone's
personal room. Token minting verified working; a real two-party call is not verified.

### Build process

```bash
npm install
npm run dev     # next dev (Turbopack) on :3000
npm run build   # next build
npm start       # next start
npm test        # vitest run
npm run lint    # eslint
npx tsc --noEmit
```

**Notes for future developers:**
- **`start-dev.bat` uses `--port 3001`, but `.env.local` sets `AUTH_URL`/`NEXTAUTH_URL` to
  `http://localhost:3000`.** Starting via that script breaks Google OAuth callbacks. Use
  `npm run dev` (port 3000) or fix one of the two. This mismatch is unresolved.
- Cold Turbopack compiles are slow in dev (first request to a route can take 20–45s). Not a
  production characteristic.
- After deleting or adding routes, stale generated types in `.next/types/` can make
  `npx tsc --noEmit` fail with "Cannot find module '.../page.js'". **Run `npm run build` once
  to regenerate, then re-run `tsc`.** This is expected, not a real error.

### Deployment

Vercel, project `voxa`, from `main`. **The Vercel CLI is not installed locally**, so
`vercel env pull` / `vercel deploy` / `vercel logs` were unavailable during this work.
Installing it (`npm i -g vercel`) is recommended.

Production environment variables must be maintained in the Vercel dashboard. Note the
production copy of `AI_MODEL_DEFAULT` may still point at the paid model — harmless, because the
chain falls through, but it wastes one round trip per request.

### Security configuration

No custom security headers, CSP, or WAF rules are configured. Vercel's defaults apply.
Configuring a CSP would be worthwhile before a public launch.

### Production vs development configuration

The only intended differences are the environment variables. There is currently **no** separate
development database, which is the problem described above. There is no staging environment.

---

## 6. Security review

### Authentication

Auth.js v5, JWT sessions, bcrypt cost 12. `AUTH_SECRET` signs tokens. Google and credentials
providers both reject banned users. Passwords 8–100 chars; **no complexity requirement** — a
deliberate usability trade-off, and defensible given the brute-force throttle, but worth
revisiting.

### Authorization

**Audited across all 48 API routes.** Every route calls `auth()` except two, each correctly
public: the NextAuth handler and `POST /api/auth/register`. (`GET /api/theme` was the third; it
has since been deleted, so the count is now 47 routes.)

**Every conversation route verifies the caller is in `participants`** — checked individually
across `chat/[sessionId]`, `chat/[sessionId]/messages`, `chat/[sessionId]/leave`,
`chat/[sessionId]/feedback`, `chat/[sessionId]/typing`, `session/[id]/messages`,
`session/[id]/token`, `session/[id]/end`. **No IDOR found.**

Tutor sessions are ownership-scoped in the query itself (`loadOwnedTutorSession` filters on
`userId`). Verified live: one account attempting to continue another's session receives 404
`SESSION_NOT_FOUND`.

Admin routes each independently re-check `role === 'admin'` — the middleware gate is defence in
depth, not the only control. Verified live: all three new admin endpoints return 403 to a
non-admin session.

### Rate limiting

See 3.21 for the full table. The three endpoints reachable before sign-in are all throttled,
which matters because two of them run bcrypt — roughly a quarter-second of CPU each by design.
Unthrottled, that is both a brute-force oracle and a cheap way for one client to saturate the
server.

**Verified live:**
- Registration returns 429 on the fifth attempt within the window.
- Eleven wrong passwords lock an account so that even the **correct** password is refused.
- A *different* account signing in from the same address still succeeds — the lockout is scoped
  per account, not global, so one attacker cannot lock out every user.

### Sensitive routes and data handling

- `/api/users/search` deliberately does **not** return `email`. Verified.
- `/api/user/me` returns the full user document minus `passwordHash`.
- `PATCH /api/user/me` uses an allow-list, and explicitly rejects language fields to keep a
  single writer for language data.
- `/api/ai-practice` rejects ten client-supplied fields that could tamper with the system
  prompt, model choice, or claimed history.
- `admin/db/[collection]` is a powerful arbitrary-CRUD surface, mitigated by admin role plus a
  collection whitelist.
- Rate-limit subjects are hashed so abuse controls do not store IPs or emails.
- Error screens show `error.digest`, not raw messages.
- The OpenRouter API key is asserted absent from logs by a unit test.

### Known attack vectors and mitigations

| Vector | Mitigation | Residual risk |
|---|---|---|
| Credential brute force | Per-email + per-IP throttle | Distributed attack across many IPs |
| bcrypt CPU exhaustion | Throttle before hashing | Low |
| Account-creation spam | 5/hour/IP | IP rotation |
| Account enumeration | — | **Present**: registration names the conflicting field |
| Prompt injection / model tampering | Forbidden-field rejection; server-owned history | Content-level injection inside a message is possible but only affects that user's own session |
| Shared AI quota exhaustion | Three-tier budget, global checked last | Provider cap is still only 50/day |
| Cloudinary quota abuse | 10 uploads/hour/user | Low |
| Malicious file upload | MIME check + Cloudinary server-side image validation | Client MIME is spoofable; Cloudinary is the real gate |
| IDOR on conversations | Participation checks everywhere | None found |
| Cross-user tutor session access | Ownership in the query | None found |
| Privilege escalation to admin | `role` only writable via admin API | Admin API itself is role-gated |
| XSS | React escaping; no `dangerouslySetInnerHTML` in app code | Low |
| CSRF | NextAuth CSRF tokens on auth; same-origin JSON elsewhere | Low |
| Session theft | JWT in an httpOnly cookie | Standard |

### Remaining risks

1. ~~No CSP or custom security headers.~~ **Resolved** — see 3.35. A CSP, HSTS, X-Frame-Options,
   X-Content-Type-Options, Referrer-Policy and a scoped Permissions-Policy are now set in
   `next.config.ts` and verified live against LiveKit, Cloudinary, Google avatars and flagcdn.
2. **Account enumeration** on registration.
3. **No password complexity requirement.**
4. **Admin surface is very powerful** — `admin/db` can edit any whitelisted collection,
   including `users`. `moderationactions` is deliberately **excluded** from that whitelist —
   see 3.36 — so the one collection meant to be tamper-evident can't be edited through it.
5. **No email verification enforcement**, so email ownership is unproven for credentials
   accounts.
6. **Shared dev/prod database** — a careless local script could damage production data.
7. ~~No moderation audit trail.~~ **Resolved** — see 3.36. Bans/unbans and report status
   changes are now recorded in `ModerationAction` with actor, target and reason.

---

## 7. Performance review

### Server Components

The dashboard, progress, ai-practice, match/chat, match/video, friends and settings pages are
Server Components. Each conversion removed a client fetch waterfall and a hydration flash.
Verified for the dashboard: display name, username and target language are all present in the
initial HTML, and the page issues **no `/api/user/me` request**. Verified the same way for
friends and settings: both serve their `<h1>` in the server HTML, and settings serves the
user's name, email, languages and interest tags with it.

**No page-level client data fetch remains.** `/messages` still polls, which is a live feature,
not a load-time waterfall.

The `(app)` layout resolves identity and the friend-request count once per render and passes
them down, replacing per-component `useSession()` calls that rendered placeholder values first.

### Streaming

Tutor replies stream as NDJSON. Measured: 14 incremental render steps, 102→173 characters
between 9.1s and 12.0s. Perceived wait fell from ~12s to ~9s. The residual 9s is provider
time-to-first-token on the free tier — a paid model would cut it to under a second, so **the
best available performance win here is commercial, not technical.**

### Hydration

One hydration error was introduced and fixed during this work (an `<img>` inside a native
`<option>`). Console is clean of hydration warnings on dashboard, explore, progress, friends,
ai-practice and the auth pages.

### Caching

Minimal by design (section 4). Streaming responses are `no-store`. The one cached read is the
site palette (`getAppTheme`), through `unstable_cache` with a tag the admin theme route
invalidates. `use cache` was not used because it requires the `cacheComponents` flag, which this
project does not set; adopting Cache Components is a separate decision.

### Network requests

Per signed-in page load, the client currently issues:
- `GET /api/auth/session` — **twice**, from `SessionProvider`

Everything else is server-rendered. The duplicate session call is the only remaining
load-time request, and is a small known waste.

### Optimisations completed

1. Dashboard, progress, ai-practice and both match pages converted to Server Components.
2. Navigation identity resolved once server-side.
3. Friend-request count reduced from a three-list populate to a single projected field.
4. `getProgressSummary` rebuilt on aggregations and bounded queries — `countDocuments`, one
   `$sum`/`$size` aggregation instead of fetching transcripts, `distinct` for languages, limits
   on lists, and the streak scan scoped to its 30-day window. A user with hundreds of sessions
   no longer costs proportionally more to serve.
5. Message polling switched to incremental (`?after=`) instead of refetching the window every
   10 seconds.
6. Tutor history capped at the last 20 messages upstream — prompt size is the dominant AI cost.
7. Stale-response races eliminated in five paginated views via request cancellation.
8. Cascading renders eliminated by deriving loading state instead of setting it in effect bodies.
9. `/friends` and `/settings` converted to Server Components — the last two full-page spinners.
10. The site palette moved from a per-page `GET /api/theme` to a cached server read rendered into
    the HTML. That removed both a request per page load and the flash of default amber before
    the custom colour landed.
11. `recharts` uninstalled after confirming nothing imported it.

### Remaining opportunities

1. **Deduplicate the `SessionProvider` session calls.**
2. **Reduce the `jwt` callback's database read** on every token refresh — currently the cost of
   keeping `role`/`isBanned` fresh. A short in-token TTL could halve it.
3. **Bundle analysis has never been run.**
4. **Add compound indexes** guided by real query patterns once there is production traffic.

---

## 8. Production readiness by subsystem

| Subsystem | Status | Why |
|---|---|---|
| Google OAuth | **Production Ready** | Verified end to end, ban-checked, auto-provisions users |
| Email/password sign-in | **Mostly Ready** | Works and is throttled, but no password recovery |
| Registration | **Production Ready** | Validated, throttled, verified 429 behaviour |
| Onboarding | **Production Ready** | One required step, gated, unsaved-changes guard fixed |
| AI tutor (code) | **Production Ready** | Chain, persistence, streaming, metering, all verified live |
| AI tutor (service) | **Needs Work** | Provider allows 50 req/day account-wide — commercial blocker |
| Tutor persistence | **Production Ready** | Verified reload, resume, continue, end, cross-account refusal |
| Tutor streaming | **Production Ready** | Verified incremental render; errors before commit stay HTTP |
| Cost metering | **Production Ready** | Three tiers, ordering tested, live 429 verified |
| Language matching | **Mostly Ready** | Engine correct and verified; depends on user liquidity |
| Friends & requests | **Production Ready** | Full loop verified with two accounts |
| Messaging | **Production Ready** | Cross-account delivery verified; paging bug fixed |
| Conversation list | **Production Ready** | Real data, preview promotion works |
| Notifications | **Not Implemented** | Fake implementation deleted; only the friend badge exists |
| Dashboard | **Production Ready** | Server-rendered, real recent practice |
| Navbar search | **Production Ready** | Keys, copy and full combobox pattern fixed and verified |
| Explore | **Production Ready** | Real data, filters, pagination verified |
| Profile | **Production Ready** | Real data |
| Settings | **Mostly Ready** | Works; client-fetched; two buttons share one endpoint |
| Subscription/billing | **Not Implemented** | Fiction removed; scaffolding retained deliberately |
| Admin console | **Mostly Ready** | Real data throughout; four pages statically verified only |
| Reports & moderation | **Mostly Ready** | Real queue and working actions; audit trail now exists (3.36), no appeals |
| User blocking | **Production Ready** | Enforced across friends, messaging, matching and search; verified live with two accounts |
| Moderation audit trail | **Mostly Ready** | Implemented, unit tested, matches established patterns; write path not yet exercised through a real admin session (3.36) |
| Rate limiting | **Production Ready** | One tested implementation across 13 actions; now genuinely fails open when the database is unreachable |
| Error handling | **Production Ready** | Three boundary layers, verified with a real crash |
| 404 handling | **Production Ready** | Branded, in-app variant keeps navigation |
| Loading states | **Production Ready** | Route-level fallback plus derived per-view states |
| Accessibility | **Needs Work** | Lint clean and combobox fixed; no audit of video controls, contrast, or the streaming transcript |
| Live video | **Needs Work** | Tokens and pre-join verified; **a real two-party call never tested** |
| Pre-join screen | **Production Ready** | Two real bugs fixed (preview never displayed; camera leak) |
| Cloudinary uploads | **Mostly Ready** | Validated and throttled; old assets never deleted |
| Progress | **Production Ready** | Real data, bounded queries, streak unit tested |
| Languages/CEFR | **Production Ready** | Single registry, plain-language levels, legacy migration |
| Flags | **Production Ready** | Image-based, works on Windows |
| Theme | **Mostly Ready** | Functional; not deeply tested in both themes |
| Password reset | **Not Implemented** | No email provider; page is now honest about it |
| Email verification | **Not Implemented** | Deleted; `isVerified` unenforced |
| Presence | **Mostly Ready** | Endpoint exists; no heartbeat |
| Page content CMS | **Mostly Ready** | Works; landing page does not consume it |
| Deployment | **Mostly Ready** | Vercel configured; no staging, no CLI locally |
| Database infrastructure | **Needs Work** | Dev and prod share a database named `test` |
| Error reporting | **Production Ready** | Structured `lm-error` records with correlation ids, server and browser, verified live |
| Alerting & metrics | **Needs Work** | Nobody is watching the reports; no product analytics or performance data |

---

## 9. Technical debt

### Critical

**9.1 OpenRouter quota — 50 requests/day account-wide.**
*Why it exists:* the account never purchased credits; the app was built against the free tier.
*Impact:* the core feature is unusable at any real scale. With 21 accounts that is ~2 messages
each per day.
*Difficulty:* trivial technically, requires spending ~$10.
*Solution:* buy credits; point `AI_MODEL_DEFAULT` at a paid model; raise
`AI_DAILY_REQUEST_BUDGET`. **Owner decision — costs money.**

**9.2 No password recovery.**
*Why:* the app has no email provider; the original page was non-functional decoration.
*Impact:* a credentials user who forgets their password is permanently locked out without
operator intervention.
*Difficulty:* moderate — needs a provider (Resend/Postmark/SES), a token model, two routes and
two pages.
*Solution:* choose a provider, then implement reset-request → tokened email → reset form.
**Owner decision — external credentials, possibly cost.**

**9.3 Development and production share a database named `test`.**
*Why:* the original connection string; never separated.
*Impact:* local work writes into production data; test accounts pollute Explore; a careless
script could destroy real data.
*Difficulty:* moderate — a data migration, not a config change.
*Solution:* create a second database on the same free cluster, move production data, split the
connection strings. **Owner decision — risks production data.**

### High

**9.4 Live video never tested with two real participants.**
*Why:* only one camera was available during development.
*Impact:* the flow could fail in ways no amount of code reading reveals; it depends on a
third-party service.
*Difficulty:* low — needs two devices and ten minutes.
*Solution:* two humans, two cameras, one call. Check tokens, join, publish, subscribe,
mute/unmute, leave, and the ended-session state.

**9.5 Four admin pages verified only statically.**
*Why:* no admin account was available, and both routes to creating one were correctly blocked.
*Impact:* `billing`, `database`, `feedback` and `sessions` may have runtime defects.
*Difficulty:* low.
*Solution:* promote one account to `role: 'admin'` and click through every admin page.

**9.6 Test and junk accounts live in the production database.**
*Why:* shared database plus historical manual testing. Known: `test`, `testuser`, `testuser1`,
`testuser2`, `testuser123`, `testuser456`, `testuser_lm`, `testasdasdasd`, `chrometest2`,
`tesst`, plus accounts created during this work: `qaftue001`, `qaphase001`, `throttleprobe1`,
`throttleprobe2`, and one conversation and friendship between the first two.
*Impact:* Explore shows fake users to real users; counts are inflated.
*Difficulty:* low, but touches production data.
*Solution:* delete after 9.3, so deletion is not being done against a live shared database.

**9.7 ~~No observability.~~** Resolved in `0d8c90b`. Every failure is a structured `lm-error`
line carrying a correlation id and, for renders, the digest the user was shown; see 3.34.
*What remains:* **nobody is alerted.** Reports land in runtime logs and, if
`ERROR_REPORT_WEBHOOK_URL` is set, in a webhook — but no one is watching either, and there is
still no product metrics or performance instrumentation (that is roadmap #13). Setting the
webhook to a Slack channel is the cheapest next step and needs no code.

### Medium

**9.8 ~~`/friends` and `/settings` are client-fetched behind full-page spinners.~~** Resolved in
`7ff87da`. Both render on the server; their data access lives in `lib/friends.server.ts` and
`lib/settings-form-state.ts`.

**9.9 Old Cloudinary avatars are never deleted.**
*Why:* the upload route only writes.
*Impact:* storage grows monotonically; `Upload` rows accumulate.
*Difficulty:* low.
*Solution:* on replacement, look up the previous `Upload` for that user and
`cloudinary.uploader.destroy` best-effort. **This deletes user files — a considered change, not
a drive-by.**

**9.10 `SessionProvider` issues two `/api/auth/session` calls per page load.**
*Difficulty:* low. *Solution:* audit provider placement and `refetchOnWindowFocus`.

**9.11 `jwt` callback reads MongoDB on every token refresh.**
*Why:* keeps `role` and `isBanned` fresh.
*Impact:* a database read per page load.
*Difficulty:* moderate. *Solution:* cache claims in the token with a short TTL, accepting a
delay before a ban takes effect.

**9.12 `start-dev.bat` uses port 3001 while `AUTH_URL` says 3000.**
*Impact:* starting via that script breaks Google OAuth callbacks.
*Difficulty:* trivial. *Solution:* change one of them; probably delete the script.

**9.13 Messages page is 774 lines.**
*Impact:* hard to navigate; audited and sound, but change is riskier than it should be.
*Difficulty:* moderate. *Solution:* extract the composer, the thread and the feedback dialog.
Note the polling/realtime logic is correct — **do not rewrite it, just move it.**

**9.14 `isVerified` exists but is never enforced.**
*Impact:* email ownership is unproven for credentials accounts.
*Difficulty:* depends on 9.2. *Solution:* enforce after email exists.

**9.15 ~~`recharts` is now an unused dependency.~~** Resolved in `c9cee82` — uninstalled.

### Low

**9.16 ~~No CSP or custom security headers.~~** Resolved in the CSP block (3.35) —
`next.config.ts` `headers()` now sets CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
Referrer-Policy and Permissions-Policy, verified against LiveKit, Cloudinary, Google avatars and
flagcdn with no violations.

**9.17 Account enumeration on registration.** Deliberate usability trade-off; revisit if abuse
appears.

**9.18 No password complexity requirement.** Throttling mitigates; consider a breach-list check.

**9.19 Settings has two buttons calling one endpoint.** "Reset to defaults" and "Delete my
data" both `DELETE /api/user/me/ai-profile`. Neither misrepresents what it does, but "Delete my
data" implies more than AI preferences.

**9.20 ~~No moderation audit trail.~~** Resolved in the blocking/moderation block (see 3.36) —
`ModerationAction` records who banned/unbanned whom and who moved a report to reviewed/resolved/
dismissed, with a reason where one exists. *What remains:* there is no UI to search or filter
the log beyond newest-first, and no export.

**9.21 `dns.setServers(['8.8.8.8','8.8.4.4'])` in `db.ts` is unexplained.** Predates this work;
plausibly involved in the 13-minute connection stall. **Investigate before removing — it may
be load-bearing on the owner's network.**

**9.22 No pagination backwards through message history.** The cursor only moves forwards; the
newest 100 is all a user can see.

**9.23 `interests` sub-selections are collected but unused** beyond category presence.

**9.24 `voiceIntro` on the user model is unused.**

**9.25 No staging environment.**

**9.26 `plan.md` is stale** and superseded by this document.

### Cosmetic

**9.27 Presence has no heartbeat**, so `lastSeenAt` is sparse.
**9.28 `Notification` type remains in `src/types/` after the feature was deleted.**
**9.29 Landing page does not consume the `PageContent` CMS.**
**9.30 Admin `flags` page is a placeholder** (honest, but empty).
**9.31 No favicon/OG image customisation** beyond the default.

---

## 10. Business readiness

### Can real users use it?

**Yes, with two caveats.** A user can register, onboard, practise with the AI tutor, be matched
with a partner, exchange messages, add friends and see genuine progress. The caveats: the tutor
runs out after ~50 requests/day platform-wide, and a credentials user who forgets their password
needs an operator.

### Can friends test it?

**Yes — today.** This is the right immediate step. A handful of testers fits inside the 50/day
quota, and password resets can be done manually. Recommend Google sign-in for testers to avoid
the recovery gap entirely.

### Can a closed beta start?

**Yes, with limits.** Roughly 10–20 users if AI usage is light. Before starting: add credits
(removes the main constraint), tell testers to use Google sign-in, and add error tracking so
failures are visible.

### Can a public beta start?

**Not yet.** Three things must be true first:
1. AI quota raised (~$10) — otherwise the core feature fails for most visitors.
2. Password recovery exists — otherwise support load and lockouts are guaranteed.
3. Dev/prod database separation and junk-account cleanup — otherwise real users see fake
   profiles and local work endangers production data.

Strongly recommended alongside: error tracking, and a real two-party video test.

### Can subscriptions begin?

**No.** There is no payment provider, no checkout, no entitlement enforcement, and no per-tier
limits. The scaffolding (`plan`, `PricingPlan`, admin billing endpoints) is a starting point,
not a system. Realistically: pick a provider (Stripe, or Vercel Marketplace), define what the
paid tier actually gives, wire entitlements into the tutor budget (which is already the natural
enforcement point), then build checkout.

**Do not add paid-tier UI before that exists** — that mistake was already made and cost a phase
to unwind.

### Can it become profitable?

Plausibly, but not yet demonstrable. The economics are favourable in shape: the marginal cost
per user is AI tokens, which the three-tier budget already caps, and the tutor's history window
(20 messages) already controls the dominant cost driver. LiveKit and Cloudinary are the other
variable costs, both currently unmetered by usage tier.

What is missing is any evidence of demand: no analytics, no retention data, no cohort
information. The honest position is that the product is now good enough to *learn* whether
people want it — which is the point of a beta.

### Biggest business risks

1. **No demand evidence.** Nothing is instrumented, so the beta must be designed to produce
   learning, not just uptime.
2. **Two-sided liquidity.** Human matching only works if compatible users are online together.
   The AI tutor is the correct hedge and should stay the headline.
3. **AI cost scaling.** Capped today, but a paid tier changes the calculus and the caps will
   need revisiting.
4. **Moderation exposure.** Strangers talking to strangers, with reporting but no blocking, no
   appeals and no audit trail.
5. **Trust.** The product previously showed invented data. That is fixed, but the standard must
   hold — a single fabricated number in a beta is disproportionately damaging.

### Biggest technical risks

1. **Shared dev/prod database** — the highest-severity operational risk.
2. **Nobody is alerted.** Failures are no longer silent — every one is recorded as a structured
   `lm-error` line with a correlation id (3.34) — but with `ERROR_REPORT_WEBHOOK_URL` unset,
   seeing a failure still requires somebody to go and read the logs.
3. **Untested video** — a whole feature depends on an unverified third-party integration.
4. **Single points of failure** — MongoDB outage is total; LiveKit outage removes video and
   degrades text.
5. **Auth.js v5 is a beta dependency** — API changes are possible.

---

## 11. Product decisions

Each of these was a considered choice. **The "never revert" notes matter — several of these
were expensive to get right.**

### 11.1 Only one onboarding step is required

*Decision:* `REQUIRED_STEPS = ["languages"]`. Everything else is optional and deferrable.
*Why:* the tutor cannot function without a language profile, but nothing else blocks value. A
new user reaches real practice in one screen.
*Alternatives:* require all five (higher abandonment); require none (tutor cannot be
configured).
*Never revert:* do not add steps to `REQUIRED_STEPS` without a concrete reason. The dashboard
card exists precisely so optional steps can be completed later.

### 11.2 Remove fabricated data rather than keep it as "demo content"

*Decision:* delete `/subscription`, `/community`, `/schedule`, the invented admin charts, and
the fake notifications.
*Why:* an empty dashboard is honest; an invented one invites decisions based on fiction. A
"Perm Ban" button that does nothing is worse than no button.
*Alternatives:* label it "demo data" (users do not read labels); keep it for screenshots (build
screenshots separately).
*Never revert:* **do not reintroduce placeholder content into user-facing or admin surfaces.**
This principle was applied repeatedly and is the project's clearest quality signal.

### 11.3 Free-model fallback chain instead of buying credits

*Decision:* build a chain that degrades to zero-cost models rather than requiring payment.
*Why:* the instruction was to avoid unnecessary paid services, and production was broken *now*.
The chain also protects against future misconfiguration — an expired key or retired model id no
longer takes the tutor offline.
*Alternatives:* hard-code one free model (fragile); require credits (blocks all progress).
*Never revert:* keep the chain even after credits are purchased. It is the reason a
configuration mistake cannot break the core feature.

### 11.4 Timeouts do not advance the model chain

*Decision:* 402/404/429/5xx advance; timeouts and malformed replies do not.
*Why:* unavailability failures return in under a second, so walking the chain is cheap. A
timeout means the model *is* responding slowly — three chained 25s timeouts would strand the
user for over a minute.
*Never revert:* this asymmetry is tested. Making timeouts retryable would produce 75-second
waits.

### 11.5 Server owns tutor conversation history

*Decision:* the client sends only a session id and the new message; `history` is a rejected
field.
*Why:* the server no longer trusts the caller's account of what was said, request bodies stay
small on long conversations, and a session cannot be redirected to another language mid-flight.
*Alternatives:* keep client-sent history (simpler, untrustworthy); sign the history (complex).
*Never revert:* removing this would reintroduce a tampering surface.

### 11.6 Shared daily AI budget checked last

*Decision:* burst → personal daily → global, in that order.
*Why:* every check increments. Consulting the shared budget first would let rejected spam
inflate it, allowing one abuser to deny everyone.
*Never revert:* the ordering is explicitly tested. It is not stylistic.

### 11.7 Global AI budget defaults to 45, below the provider's 50

*Why:* users meet the app's clear "try again tomorrow" instead of an opaque upstream 429 raised
after three failed model attempts.
*Never revert:* **do not raise `AI_DAILY_REQUEST_BUDGET` without first raising the provider
quota.**

### 11.8 Normalise language codes server-side

*Decision:* normalise in `matchRequestSchema` at the API boundary, not in the client.
*Why:* the casing bug silently broke all reciprocal matching. Fixing only the client would
leave the boundary trusting input and the bug one refactor away from returning.
*Never revert:* **this fixed the single most damaging bug in the project.** Any new
language-accepting endpoint must normalise at the boundary.

### 11.9 Streaming commits to 200 only after the first chunk

*Why:* every way of failing to reach a model happens during that first pull. Committing earlier
would bury real HTTP statuses inside a stream the client had begun rendering.
*Never revert:* this is why `NO_CREDITS`, `RATE_LIMIT` and `TIMEOUT` still reach the client as
proper statuses.

### 11.10 NDJSON instead of raw SSE for the tutor stream

*Why:* the stream must carry a `session` event and typed errors, not just text. NDJSON is
trivially parseable and needs no `EventSource`.
*Alternative:* SSE with named events (heavier client, no real gain).

### 11.11 Persist partial tutor replies

*Why:* whatever the learner read is already in their context. Discarding it would make the next
turn incoherent.
*Alternative:* only persist complete replies (loses text the user saw).

### 11.12 Friends in nav, in the mobile More menu

*Why:* it must be reachable — the acceptance loop was broken without it — but it is
lower-frequency than practising or messaging, so it does not deserve a primary mobile slot. The
badge on the More trigger surfaces pending requests anyway.
*Never revert:* removing `/friends` from navigation re-breaks friend requests entirely.

### 11.13 Friend count computed server-side, not polled

*Why:* the navigation needs a number. `GET /api/friends` populates three full user lists;
`countIncomingFriendRequests` projects one field. Polling would add cost for a badge.
*Trade-off:* the badge updates on navigation, not instantly — hence `router.refresh()` after
accept/decline.

### 11.14 Flags as CDN images, not emoji

*Why:* Windows renders 🇬🇧 as the letters "GB", so badges read "GB English". This follows the
approach the country selector already used.
*Alternatives:* drop flags entirely (loses a scanning aid, and would be a unilateral visual
change); ship a flag sprite (more assets).
*Never revert:* and **never put `FlagImage` inside a native `<option>`** — that causes a
hydration error, which is why Explore's language filter shows names only.

### 11.15 Keep `/forgot-password`, delete `/verify-email`

*Why:* password recovery is a real need and that URL is where people look, so an honest page is
useful. Email verification is not enforced anywhere, so its page was pure fiction with nothing
behind it.
*Never revert:* do not restore a reset form that cannot send email.

### 11.16 Progress counts only what can be counted

*Why:* the messages figure spells out its two halves because a tutor session stores both sides
while partner messages count only the user's own. "Days practised" says "in the last 30 days"
because that is the query window.
*Never revert:* combining those into one unlabelled total would recreate the quietly-wrong
number this project spent phases removing.

### 11.17 Streak counts yesterday as current

*Why:* a streak should not read as broken because the user has not practised yet today.
*Never revert:* it is unit tested with the gap and expiry cases.

### 11.18 Derived loading state instead of loading flags

*Decision:* pages record which page/filter/collection their data belongs to and are "loading"
while that differs from what is requested.
*Why:* removes cascading renders, and removes a boolean that can fall out of sync with the data.
It also enabled request cancellation, which fixed a real stale-response race.
*Never revert:* reintroducing `setLoading(true)` in an effect body brings back both the lint
error and the race.

### 11.19 Rate-limit keys are hashed

*Why:* these documents persist for the window. Keying them on raw IPs or emails would mean
storing personal data to solve an abuse problem.
*Never revert:* hashing is salted with `AUTH_SECRET`, so keys are also useless outside this
deployment.

### 11.20 No SDK for OpenRouter

*Why:* the integration needs a custom model chain, custom advance rules, SSE parsing and precise
error classification — exactly what an SDK abstracts away. ~200 lines, 32 tests.

### 11.21 One brand mark component

*Why:* it was inlined six times and had already drifted, so the logo changed as a user moved
from sign-up into the product. Unified on the majority glyph rather than imposing a rebrand.

### 11.22 Error boundaries inside the app shell

*Why:* a user whose page broke keeps their navigation and can go elsewhere, instead of being
dropped onto a bare screen.

### 11.23 Show `error.digest`, never raw error messages

*Why:* enough to correlate a user report with a server log; nothing leaked.

### 11.24 Underscore-prefixed unused bindings are allowed

*Decision:* configure `no-unused-vars` with `^_` ignore patterns rather than deleting
deliberately-unused parameters.
*Why:* the codebase already used that convention. Leaving standing warnings trains people to
ignore lint output.

### 11.25 The theme is server-rendered, and its invalidation is not the recommended one

*Decision:* read the palette on the server through `unstable_cache`, render it into the HTML,
and invalidate with `revalidateTag(tag, { expire: 0 })` from the admin theme route.
*Why not `use cache`:* it requires the `cacheComponents` flag, which this project does not set.
Turning that flag on is a project-wide change, not a side effect of a theme fix.
*Why not the recommended `'max'` profile:* `'max'` is stale-while-revalidate, so an
administrator who saved a colour would still see the old one on the very next render. `expire: 0`
keeps read-your-writes. The single-argument form that used to mean this is deprecated in
Next 16, so it is not an option.
*Consequence:* admin-authored custom CSS is now inlined into a server-rendered `<style>`, where
`element.textContent`'s guarantee no longer protects it. `sanitiseCustomCss` strips `</` for
that reason — **do not remove it**, and do not assume it is theoretical because only admins can
reach it.

### 11.26 The friends page adopts server data during render, not in an effect

*Decision:* compare the incoming prop against the last one seen and call `setState` during
render, rather than syncing in `useEffect`.
*Why:* the page keeps optimistic state so accepting a request feels instant, but the server owns
the truth after `router.refresh()`. Doing that in an effect renders twice and is exactly the
cascading-render pattern `21cbb41` removed — the lint rule catches it, and it is right to.

### 11.27 Error reporting writes to logs, with a webhook seam, instead of adopting a provider

*Decision:* structured one-line logs as the always-on sink, plus optional
`ERROR_REPORT_WEBHOOK_URL` forwarding. No Sentry SDK, no account, no dependency added.
*Why:* the roadmap said "Sentry or Vercel", but adopting a hosted tracker means an external
account and a decision that belongs to the owner (section 16), and the app would then depend on
a key that does not exist yet. stdout is captured by Vercel with no account, no key and no cost,
so this works the moment it deploys. A webhook URL is enough to get real alerts in Slack or
Discord today, and it is also where a hosted tracker plugs in later — **adding one is a
configuration change, not a rewrite.**
*Trade-off:* no grouping, no dashboards, no release tracking. Accept until failure volume makes
those worth paying for.

### 11.28 Error boundaries report only failures without a digest

*Decision:* `error.tsx` and friends call the browser reporter only when `error.digest` is absent.
*Why:* a digest means `onRequestError` already recorded it server-side. Reporting from the
boundary as well would double every server-side failure, and duplicates in an error log are
worse than they sound — they make frequency meaningless, which is the main thing an error log is
read for. Digest-less errors happened in the browser and reach the server no other way.

### 11.29 Logged fields are allow-listed, and the client address is not one of them

*Decision:* keep five named headers; drop everything else including `x-forwarded-for`.
*Why:* a deny-list is defeated by any header nobody anticipated, and `cookie` carries the session
token. The address is omitted because it identifies a person: the same reasoning that made
rate-limit keys hashed (11.19) applies to a log line that a support process will read.

### 11.30 The rate limiter now fails open on connection failure too

*Decision:* move `await connectDB()` inside `checkRateLimit`'s existing try.
*Why:* the limiter documented that it fails open so a database hiccup cannot lock users out, but
connecting sat outside the guard — so an unreachable database threw straight out of it and every
rate-limited endpoint returned 500 instead of degrading. This was found by the client-error
endpoint 500ing during verification, which is a good argument for the endpoint's existence: the
one thing that must work during an outage is the thing that records outages.
*Trade-off:* unchanged from the original decision — a MongoDB outage disables abuse protection.
That was already true for every other failure mode of this function.

---

## 12. Remaining roadmap

Priority reflects value per unit of effort and dependency order.

**Read section 18 before picking anything from this list.** It records permanent
product-direction constraints — AI provider independence, teaching in the learner's own
language, SEO as a product requirement, and (18.5) voice-first human exchange — that decide
which of these items may be built and how.

### Immediate (before any wider testing)

| # | Task | Priority | Difficulty | Impact | Dependencies |
|---|---|---|---|---|---|
| 1 | **Buy ~$10 OpenRouter credits**; set `AI_MODEL_DEFAULT` to a paid model; raise `AI_DAILY_REQUEST_BUDGET` | Critical | Trivial | Unblocks the core product and makes it ~10× faster | Owner spending money |
| 2 | ~~Add error tracking and forward `error.digest`~~ | — | — | **Done** in `0d8c90b` — see 3.34 and 11.27. **Remaining: point `ERROR_REPORT_WEBHOOK_URL` at a Slack or Discord webhook**, so somebody is actually told. Configuration only, no code | — |
| 3 | **Promote one account to admin and click through every admin page** | High | Low | Removes the largest statically-verified-only gap | Owner grants access |
| 4 | **Test live video with two real cameras** | High | Low | The only wholly unverified feature | Two devices |

### Short term (before a public beta)

| # | Task | Priority | Difficulty | Impact | Dependencies |
|---|---|---|---|---|---|
| 5 | **Separate dev and prod databases** | Critical | Moderate | Removes the top operational risk | Owner approval; data move |
| 6 | **Delete junk/test accounts** | High | Low | Real users stop seeing fake profiles | #5 first |
| 7 | **Implement password reset** | Critical | Moderate | Closes the only permanent lockout | Email provider |
| 8 | **Enforce email verification** | Medium | Low | Proves email ownership | #7 |
| 9 | ~~Configure CSP and security headers~~ | — | — | **Done** — see 3.35 and 9.16. Verified against LiveKit, Cloudinary, Google avatars and flagcdn | — |
| 10 | ~~Cache `/api/theme`~~ | — | — | **Done** in `c9cee82` — server-rendered from a cached read instead | — |
| 11 | ~~Convert `/friends` and `/settings` to Server Components~~ | — | — | **Done** in `7ff87da` | — |
| 12 | ~~Delete unused `recharts`~~; **run a bundle analysis** | Low | Low | Smaller bundle | `recharts` removed in `c9cee82`; the analysis has still never been run |

### Medium term (during beta, guided by real usage)

| # | Task | Priority | Difficulty | Impact | Dependencies |
|---|---|---|---|---|---|
| 13 | **Instrument product analytics** (sign-up funnel, first-practice conversion, retention, tutor vs partner mix) | High | Moderate | The only way to learn whether anyone wants this | #2 |
| 14 | **Build the real admin analytics page** on those events | Medium | Moderate | Replaces the honest placeholder | #13 |
| 15 | **Delete superseded Cloudinary avatars** | Medium | Low | Stops a storage-cost leak | Careful — deletes user files |
| 16 | **Split the 774-line messages page** | Medium | Moderate | Maintainability. **Move the polling/realtime logic, do not rewrite it** | None |
| 17 | ~~User blocking, plus a moderation audit trail~~ | — | — | **Done** — see 3.36. Re-prioritised upward and implemented in the same block that recorded the voice-first direction (18.5), because live voice raises the cost of shipping without it | — |
| 18 | **Push notification when a match is found** | Medium | Moderate | Matching currently requires staring at the page | None |
| 19 | **Backwards pagination through message history** | Low | Moderate | Users can only see the newest 100 | None |
| 20 | **Reduce the `jwt` callback DB read** | Low | Moderate | One fewer read per page load | Accepts delayed ban propagation |
| 21 | **Accessibility audit** — video controls, contrast, `aria-live` on the streaming transcript | Medium | Moderate | Real inclusion; the tutor transcript is currently silent to screen readers | None |

### Long term (post-beta, demand-dependent)

| # | Task | Priority | Difficulty | Impact | Dependencies |
|---|---|---|---|---|---|
| 22 | **Payments and entitlements** — define the tier, wire it into the tutor budget (the natural enforcement point), then checkout | High if monetising | High | Revenue | #13 proving demand |
| 23 | **AI-powered matching** via the existing `CompatibilityProvider` seam | Medium | High | Better pairings | Enough users to matter |
| 24 | **Speaking practice** (voice in/out with the tutor) | Medium | High | The obvious product extension; `voiceIntro` already anticipates it | Cost modelling |
| 25 | **Structured curriculum or lesson suggestions** | Low | High | Retention beyond free conversation | #13 |
| 26 | **Staging environment** | Medium | Low | Safe verification | #5 |
| 27 | **Group practice rooms** | Low | High | Solves liquidity differently | None |

---

## 13. Lessons learned

### Major bugs discovered

**The rate limiter did not fail open where it mattered most.** `checkRateLimit` is documented as
failing open so a database problem cannot lock users out, and its `catch` does exactly that — but
`await connectDB()` sat *outside* the try, so an unreachable database threw straight past the
guard. Every rate-limited endpoint would have returned 500 during an outage. Found only because
the new client-error endpoint 500ed while the database happened to be unreachable. *Lesson: a
comment describing a failure mode is not evidence of it; the guard has to actually cover the
call that fails. And the code that records outages is worth testing during one.*

**The core product was entirely broken and nobody knew.** The AI tutor returned a generic 502 to
every user because `AI_MODEL_DEFAULT` pointed at a paid model on a zero-credit account. It was
invisible because the provider's error body was discarded before logging. *Lesson: never
swallow a third-party error body. The single most valuable line added in this project logs the
provider's own explanation.*

**Reciprocal matching silently failed on letter case.** `"EN" !== "en"`. Two perfect partners
would both wait forever and conclude the platform was empty. *Lesson: exact-equality matching
across a boundary demands canonicalisation at that boundary. Also: this was only found by
driving the real flow with two accounts — no amount of code reading had surfaced it in previous
sessions.*

**The friend feature was a loop with no closing edge.** Four places to send a request, zero
reachable places to accept one. *Lesson: audit features as complete round trips, not as
endpoints. Every send needs a receive.*

**Conversations past 100 messages froze.** Ascending sort with `limit(100)` returned the oldest
page forever. *Lesson: "sort + limit" without an explicit newest-first intent is a latent bug
that only appears at scale, which is exactly when it hurts most.*

**The camera preview could never work, and leaked the camera.** `srcObject` was assigned before
the `<video>` element existed; late `getUserMedia` resolutions were dropped with the track still
live. *Lesson: refs are not available in the same tick as the state that renders them. And any
resource acquired asynchronously needs a cancellation path — here the consequence was a camera
light the user could not turn off.*

**Four admin action buttons had no handlers.** An admin could press "Perm Ban" and believe
someone had been sanctioned. *Lesson: a control that looks functional and is not is worse than
no control.*

**Two non-functional pages actively lied.** Both claimed to send email in an app with no email
capability whatsoever. *Lesson: check that a feature's dependency exists before trusting its UI.*

### Unexpected architecture problems

**No database connection timeouts.** One request took **13.2 minutes** in application code after
a network flap. On Vercel that consumes the entire function budget and returns nothing. *Lesson:
every external connection needs an explicit timeout; defaults are frequently "wait forever".*

**`useSession()` is empty on first render.** Every page flashed "User" and "@me". The layout
already had the session server-side. *Lesson: if a Server Component above already has the data,
pass it down rather than re-fetching it in a client hook.*

**`react-hooks/set-state-in-effect` was pointing at real bugs.** Seven "lint errors" were
cascading renders, and fixing them properly surfaced a genuine stale-response race across five
paginated views. *Lesson: treat lint errors as findings to understand, not noise to silence.*

**Framework knowledge was out of date.** Next 16 error boundaries take `unstable_retry`, not
`reset`; `middleware.ts` is now `proxy.ts`; folders prefixed `_` are non-routable. `AGENTS.md`
says to read `node_modules/next/dist/docs/` before writing code, and following that instruction
prevented at least two wrong implementations. *Lesson: read the installed docs, not memory.*

### Important refactors

- **`mock-data.ts` (926 lines) split by truthfulness**, not by topic: genuine reference data to
  `src/constants/`, invented content to a file whose name said what it was, and eventually
  deleted entirely. Naming things honestly made the remaining work obvious.
- **Progress rebuilt on aggregations** before being put on the busiest page. Doing the
  performance work *before* the second consumer, not after.
- **`getUserProfileData` extracted** so the route handler and Server Components share one
  definition of "the user's profile".
- **`FlagImage`, `BrandMark`, `StatusScreen`, `NavIdentity` extracted** — each because the same
  thing was inlined several times and had already drifted.

### Mistakes made and corrected

- A blanket find-and-replace put an `<img>` inside a native `<option>`, causing a hydration
  error. Caught by reading the console before committing. *Lesson: mechanical edits need
  mechanical verification.*
- An automated import inserter landed a statement inside a multi-line import block and broke the
  build. Caught immediately by `tsc`.
- A rate-limit verification initially "passed" because the browser context was already signed
  in, so every redirect landed on the dashboard regardless. The test was meaningless until rerun
  in a clean context. *Lesson: verify that a test can actually fail.*
- A `redirect: 'manual'` fetch returned an opaque `status: 0`, making the assertion vacuous.
  *Lesson: an assertion on an unreadable response is not an assertion.*
- A first attempt to trip the burst limit failed because each provider call took ~5s, so fewer
  than 15 fit in a 60-second window. The limiter was correct; the test was wrong.
- A new route at `/api/users/[id]/block` **passed `npm run build` cleanly** — the route even
  appeared in the build's own page listing — but broke `next dev` outright on first request,
  because `/api/users/[username]/route.ts` already owns that path level and Next requires one
  slug name per dynamic segment. *Lesson: a clean production build does not prove a new dynamic
  route is safe; `next dev` enforces this particular constraint and the production build did
  not. Start the dev server after adding any dynamic API route, not just after adding a page.*
  Fixed by moving to a body-based endpoint (3.36), matching `/api/friends/request`'s existing
  convention rather than fighting the router over segment naming.

### Important engineering lessons

1. **Drive the real product.** Almost every severe bug was found by using the app as a user with
   two accounts, not by reading code.
2. **Verify that a verification can fail.** Several checks initially proved nothing.
3. **Fix the boundary, not the symptom.** Normalising language codes client-side would have left
   the bug one refactor away.
4. **Honest empty states beat convincing fake ones.** Repeatedly the best change was deleting
   something.
5. **Write down why in the code.** Non-obvious decisions — the chain's advance asymmetry, the
   budget's check order, `releaseGuard`, the `<option>` exception — are all commented where
   someone would otherwise "simplify" them.
6. **Ordering can be a security property.** The budget-check order is a denial-of-service
   control, which is why it is tested rather than merely written.

---

## 14. Testing

### Coverage

**287 tests passing, 4 skipped, across 30 files.** Baseline before this work: 103. The ten newest
(`blocking.server.test.ts`, `moderation.server.test.ts`) cover the blocking/moderation-audit
block (3.36).

```
src/app/(app)/ai-practice/AIPracticeClient.test.tsx   tutor UI: setup, streaming, errors, resume
src/constants/languages.test.ts                       level labels, CEFR meanings, legacy migration
src/hooks/use-unsaved-changes.test.tsx                beforeunload guard, releaseGuard, re-arming
src/lib/ai/openrouter.test.ts                         32 tests: chain, advance rules, SSE parsing
src/lib/ai/prompts.test.ts                            system prompt composition
src/lib/ai/tutor-budget.test.ts                       three tiers + check ordering
src/lib/ai/tutor-context.test.ts                      profile → tutor context
src/lib/ai/tutor-live.test.ts                         live provider test (skipped by default)
src/lib/auth-throttle.test.ts                         login/register limits, hashing, IP parsing
src/lib/language-profile.test.ts                      normalisation, completeness
src/lib/match-defaults.test.ts                        form seeding from profile
src/lib/messages/access.test.ts                        participant checks
src/lib/messages/history-window.test.ts               newest-page paging rule
src/lib/messages/reconcile.test.ts                     dedupe + ordering
src/lib/messages/routes.test.ts                        message route helpers
src/lib/friends.test.ts                                friend card mapping, absent-field defaults
src/lib/settings-form-state.test.ts                    settings seeding incl. legacy language shapes
src/lib/theme.test.ts                                  palette variables, custom-CSS sanitising
src/lib/onboarding-access.test.ts                      onboarding gate
src/lib/onboarding-progress.test.ts                    steps, completion, redirects
src/lib/progress.test.ts                               streak rule incl. gaps and expiry
src/lib/validations/ai-practice.test.ts                discriminated union, rejected fields
src/lib/validations/language-profile.test.ts           language profile schema
src/lib/validations/match.test.ts                      code normalisation, self-match rejection
src/lib/observability/error-report.test.ts             redaction, header allow-list, one-line format
src/lib/observability/report.server.test.ts            log record, correlation id, webhook delivery
src/lib/observability/client-report.test.ts            payload building, per-page cap, noise filter
src/lib/rateLimit.test.ts                              window maths, duplicate-key race, fail-open
```

Runner: Vitest, jsdom, 2 workers, `src/test/setup.ts`, with `server-only` aliased to a mock so
server modules are importable in tests.

**Philosophy:** pure logic is unit tested; I/O is verified by hand against a running server.
There are no integration tests against a real database and no end-to-end browser suite.

### Manual verification performed

Every phase was verified against a running dev server with real accounts before committing.

**Authentication.** Registration (form + auto-login), Google OAuth (full round trip),
credentials sign-in, sign-out. Registration 429 on the fifth attempt in a window. Eleven wrong
passwords locking an account so the **correct** password is also refused, and a different
account from the same address still succeeding.

**Onboarding.** Full first-run: register → `/languages` → add native → add learning → set
explanation language → save → dashboard, with no `beforeunload` prompt. Interests and mode steps
rendering relocated constants.

**AI tutor.** Start session; multi-turn with a deliberate grammar error (`Yo va allí` → the
tutor corrected to `Yo fui allí` with an explanation); reload and confirm the full transcript
resumes with correct language and mode; continue and confirm earlier context is retained
(Japan → Kyoto); end session and confirm reload returns to setup. Streaming measured with a
MutationObserver: 14 render steps, 102→173 chars, 9.1s→12.0s. Time-to-first-token 8.7s vs 12.9s
complete, 75 deltas. Rejected: client-supplied `history` (400), unknown session id (404
`SESSION_NOT_FOUND`), malformed session id (400), **and one account attempting to continue
another's session (404)**. Global budget exhaustion producing a clear message with no Retry
button. Provider chain rescue verified against the live API: paid model 402 → free model serves.

**Matching.** The exact cross-case reciprocal pair that used to fail now matches
(`matched: true`, correct partner). Validation rejections: same language both sides, unsupported
language, missing language (with a plain-language message, not Zod internals). Match form
pre-filled with Spanish/English from the profile instead of Korean.

**Messaging.** Cross-account delivery between two accounts. Cursor at newest returns 0; after
sending, returns exactly 1; full fetch 1→2; ordering chronological throughout.

**Friends.** Request sent; badge appeared as **1** on the recipient's dashboard; request listed
under Requests; accepted; friend appeared under Friends; **badge cleared**.

**Explore.** Initial load (21 users), debounced search filtering to a single result, Load more
appending (41→43 profile links).

**Search combobox.** `aria-controls` resolving to the listbox; eight options each with ids and
`aria-selected`; two ArrowDown presses moving `aria-activedescendant` to the second option.

**Error handling.** Deleted route showing the branded 404. A temporary route that throws during
server render caught by the `(app)` boundary with navigation intact and a digest shown
(`4244549219`), then removed. `/verify-email` 404ing for authenticated users and redirecting for
anonymous ones.

**Dashboard.** Verified the initial HTML contains display name, username, target language and
card heading, with **no** `/api/user/me` request and no `@me`/`User` placeholders.

**Progress.** Real data: 7 sessions (5 tutor, 2 partner), 10 messages, 2 days, 2-day streak,
Spanish, and recent rows for both kinds. Numbers unchanged after the aggregation refactor.

**Flags and levels.** Real flag images in Explore, Friends and the onboarding picker.
Proficiency dropdown listing all seven labelled options. Search resetting to empty after adding
a language.

**Authorization.** All three new admin endpoints returning 403 to a non-admin session.

**Smoke test.** All eight main routes returning 200 with their own headings server-rendered
(except `/friends`, which is client-fetched by design).

**Error reporting (`0d8c90b`).** Verified against a running dev server with temporary probe
routes, which were deleted afterwards:

| Path exercised | Evidence |
|---|---|
| Uncaught route throw | `lm-error` line, `scope:"route /api/errorprobe-temp"`, method and path recorded |
| Caught API 500 | response `{"error":"Internal server error","errorId":"7da63a08f1f4"}` and a logged line **with the same id** |
| Server Component render failure | `scope:"render /errorprobe-temp"` carrying `digest:"104943454"` — the value the user is shown |
| Uncaught browser throw | driven in a real Chromium via Playwright; arrived as `origin:"client"`, `scope:"browser window"`, `path:"/errorprobe-temp/client"` |
| Unhandled promise rejection | arrived as `scope:"browser unhandledrejection"` |
| Ingest endpoint | 204 valid, 400 on bad kind / empty message / malformed JSON, 413 over 16KB |
| Secret redaction | a probe error containing a real-shaped connection string logged as `mongodb+srv://***:***@…` and `Bearer [redacted]` |
| Header allow-list | logged headers were `user-agent` and `content-type` only |
| Webhook forwarding | local listener received both the caught API error (id matching the HTTP response) and the render failure, **after** the response was sent |

**A caveat about this verification.** MongoDB was unreachable from the shell used for it — the
SRV lookup is refused because `db.ts` pins DNS to 8.8.8.8 and that traffic is blocked in this
environment. Everything above therefore ran with the rate limiter failing open. That is a
faithful test of an outage (and is what surfaced 11.30), but **the rate limit on the ingest
endpoint has not been observed rejecting a 31st request against a live database.** Worth ten
seconds of somebody's time on a machine that can reach the cluster.

**Closing review of the block.** Re-run on a clean tree before the block was closed, so the
numbers below describe the committed state rather than a work-in-progress one:

| Check | Result |
|---|---|
| `npm test` | **277 passed, 4 skipped, 28 files** (the skips are `tutor-live.test.ts`, gated on an env flag) |
| `npm run lint` | 0 errors, 0 warnings |
| `npx tsc --noEmit` | clean |
| `npm run build` | compiled successfully in 28.5s; `/api/observability/client-error` present in the route manifest |
| Working tree | clean, no untracked files |
| Temporary artefacts | none — no probe routes, scripts or listeners tracked or on disk; nothing listening on the dev or webhook ports |
| `.env.local` | unchanged; `ERROR_REPORT_WEBHOOK_URL` was passed inline to a single now-dead process and was never written to a file |
| Diff review | 32 files; every non-observability edit is a `console.error` → `internalErrorResponse`/`reportServerError` swap plus the four deliberate changes in `proxy.ts`, `rateLimit.ts`, `theme.server.ts` and `friend-requests.server.ts` |

**CSP / security-headers block (3.35).** Verified against a running dev server and a production
build:

| Check | Result |
|---|---|
| `npm run build` | compiled successfully with the new `headers()` config; route manifest unchanged otherwise |
| `npm test` | 277 passed, 4 skipped, 28 files — unchanged, `next.config.ts` has no test surface |
| `npm run lint` / `tsc --noEmit` | clean |
| Headers present | confirmed via `curl -i` on both an HTML route (`/login`) and a JSON API route (`/api/user/me`) — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-DNS-Prefetch-Control all present |
| Console clean of CSP violations | across `/dashboard`, `/explore`, `/friends`, `/settings`, `/progress`, `/messages`, `/languages` — zero `Refused to …` messages |
| LiveKit `connect-src` | a raw unauthenticated `WebSocket` to `wss://<project>.livekit.cloud/rtc` reached the server and was rejected with LiveKit's own `HTTP Authentication failed`, not a CSP error — proof the origin is allowed, not blocked |
| `img-src` | `flagcdn.com` and `res.cloudinary.com` both loaded via a script-injected `Image()`; the real Google avatar (`lh3.googleusercontent.com`) loaded live in the running app |
| Working tree | clean; only `next.config.ts` changed |

**A pre-existing fault re-observed while testing this block, unrelated to it.** While driving
`/languages` and `/messages` signed in, `GET /api/user/me` and `GET /api/realtime/token`
intermittently returned the branded 404 page instead of their real JSON responses, alongside the
already-documented `GET /api/auth/session` failures (section 14, "A pre-existing dev-server
fault"). **Confirmed independent of CSP**: `curl` with a valid `authjs.session-token` cookie,
entirely outside the browser, reproduced the same spurious 404 on `/api/user/me` — a CSP
response header cannot alter server-side route resolution, so this is the same Turbopack
dev-worker instability already on file, now observed to affect more routes than previously
recorded. Not fixed here — out of scope for this block, and the existing note already
recommends confirming it doesn't reproduce against a production build.

### Scenarios NOT yet tested

1. **A real two-participant video call.** No second camera was available. Tokens, rooms and the
   pre-join screen are verified; the call is not.
2. **The four admin pages** `billing`, `database`, `feedback`, `sessions` — no admin account.
3. **Concurrency at scale.** Two accounts, never many simultaneous users. Match-queue races
   under load are unexplored.
4. **Realtime message delivery via LiveKit specifically.** Delivery was verified, but not
   attributed to push versus the polling fallback.
5. **The tutor's 200-message session cap.**
6. **The per-user daily tutor limit (80/day)** — only the burst and global tiers were exercised
   live; the middle tier is unit tested only.
7. **Password-based account recovery** — it does not exist.
8. **Light theme** — all verification was in dark mode.
9. **Mobile viewports** — mobile nav exists and is coded, but was never rendered at a mobile
   size.
10. **Screen-reader traversal** of the streaming tutor transcript.
11. **Cloudinary avatar upload end to end** — the route was read and rate-limited, but no image
    was actually uploaded.
12. **Cold-start behaviour on Vercel** — all testing was local.
13. **The progress empty state** — code-reviewed only; every available account had history.
14. **The friends page with non-empty lists.** The converted page was verified signed in as
    `mrekh2023`, who has no friends and no requests, so only the empty state was seen rendering.
    The lists themselves are covered by unit tests and by `GET /api/friends`, which shares the
    same query and returned the correct shape. Accepting, declining and cancelling were **not**
    exercised: doing so would have written to the shared production database.
15. **Admin theme save → cache invalidation.** `revalidateTag(tag, { expire: 0 })` is unverified
    at runtime for the same reason the admin pages are (no admin account). If a saved colour
    appears one render late, that call is the place to look.

### A pre-existing dev-server fault, for whoever sees it next

`GET /api/auth/session` returns **500 twice per page load in development**, and the browser
console shows `ClientFetchError: Unexpected token '<'`. The server log attributes it to
`Error: Jest worker encountered 2 child process exceptions, exceeding retry limit` alongside
repeated `write EPIPE`.

This is **not** caused by the Server Component conversions — it reproduces identically on
untouched routes such as `/progress`, and appears in the log from before those changes were
made. It looks like a Turbopack dev-worker crash rather than an application bug, and it has not
been reproduced against a production build. Worth confirming it does not occur in production
before assuming it is harmless.

---

## 15. Final engineering assessment

### Strengths

1. **The core loop works and is verified**, not assumed. Register → onboard → practise →
   match → converse → see progress has been walked end to end with real accounts.
2. **Honesty as an enforced property.** No fabricated data anywhere; no control that does not
   work; numbers that state their own window. This is unusual and valuable.
3. **Cost and abuse controls are real.** One tested rate limiter across thirteen actions, a
   three-tier AI budget whose check *ordering* is a security property, and bounded AI history.
4. **Failure modes are designed.** A model chain that survives credit exhaustion, retired model
   ids and upstream rate limits; limiters that fail open; a badge count that fails soft; three
   layers of error boundary; explicit database timeouts.
5. **Clean signals.** 0 lint errors, 0 warnings, `tsc` clean, 287 tests, green build.
6. **Comments explain why.** The non-obvious decisions are documented where someone would
   otherwise "simplify" them.
7. **Git history is genuine documentation.** Each commit explains the problem, the reasoning and
   the verification.

### Weaknesses

1. **One commercial blocker gates the core feature** (50 AI requests/day).
2. **No self-service password recovery** — a permanent lockout path for credentials users.
3. **Dev and prod share a database**, with test accounts visible to real users.
4. **Nobody is alerted.** Failures are now recorded and correlatable (3.34), but no one is
   watching the logs and no webhook is configured, so a production incident still waits for a
   user to report it.
5. **Video is unverified** end to end.
6. **Parts of admin are statically verified only.**
7. **No integration or end-to-end test suite.** Confidence in I/O rests on manual verification
   that will not re-run in CI.
8. **Two pages still client-fetch** behind full-page spinners.

### Maintainability — 8/10

Consistent idioms, clear module boundaries, pure logic separated from I/O, meaningful names, and
comments that explain intent. The 774-line messages page and the 494-line settings page are the
outliers. A new engineer could find their way around in a day, and the git log plus this
document would answer most "why is this like that" questions.

### Scalability — 6/10

Adequate for a beta; several known ceilings. Stateless application code scales horizontally on
Vercel. MongoDB M0 free tier will be the first hard limit. The rate limiter is
database-backed and correct across instances but adds a write per limited request. The `jwt`
callback's per-refresh database read scales linearly with traffic. Progress queries are now
bounded. LiveKit fan-out per user room is untested at volume. No caching layer exists yet.

### Code quality — 8/10

Strict TypeScript with almost no `any` outside deliberate Mongoose casts. Zod at the boundaries.
No lint suppressions hiding real problems — the one `eslint-disable` present is justified in a
comment. Error handling is typed and consistent. Tests are focused on behaviour rather than
implementation, and several encode a *reason* (the budget ordering, the paging rule) rather than
just an outcome.

### Architecture quality — 8/10

Appropriate to its size. Server-first rendering on hot paths, one clear data-access layer, a
provider seam where an algorithm is expected to change, and a single realtime dependency reused
rather than duplicated. The main architectural gap is infrastructure rather than code: no
staging, no cache strategy, shared database.

### Production confidence

**High for a closed beta. Medium for a public beta.**

Confident: authentication, onboarding, the AI tutor (given quota), messaging, friends, explore,
dashboard, progress, error handling, rate limiting.

Less confident: live video (untested), admin console (partly untested), behaviour under
concurrent load, mobile rendering, light theme.

### Risk assessment

| Risk | Likelihood | Severity | Mitigated? |
|---|---|---|---|
| AI quota exhausted during a demo | **High** | High | Partly — clear message, but the feature stops |
| A user locks themselves out of a password account | Medium | High | No |
| Local work damages production data | Medium | **Critical** | No |
| A production failure goes unnoticed | High | Medium | No |
| Video fails in front of real users | Medium | Medium | No |
| An admin page errors in use | Low–Medium | Medium | No |
| Matching finds nobody (thin liquidity) | High | Medium | Yes — the AI tutor is the hedge |
| Cost overrun from AI usage | Low | Medium | Yes — three-tier budget |
| Abuse of unauthenticated endpoints | Low | Medium | Yes — throttled and verified |
| Cross-user data access | Low | Critical | Yes — audited, no IDOR found |

### Overall score: **7.5 / 10**

A well-engineered application with genuinely good instincts — honest data, designed failure
modes, real cost controls, and verification that actually verifies. It is held back from an 8.5
by infrastructure rather than by code: a shared database, no observability, an unverified video
feature, and one purchase away from its core feature working properly.

The trajectory matters as much as the score. When this work started, the core product returned
an error to every user and several pages showed invented data. That is all fixed, with tests and
comments to keep it fixed. **What remains is mostly a short list of decisions only the owner can
make.**

---

## 16. Instructions for the next AI assistant

### Current state, briefly

`main` @ `cfaa8a2` plus this block's three commits (`f9b433b` feat, `9f401ed` docs, and a small
final-review docs commit that tightened the verification claims below), clean and synced. 287
tests, 0 lint problems, `tsc` clean, build green. The core loop works. Nothing is half-finished
or uncommitted. Twenty-two-plus phases of work are complete and documented in the git log.

### Read these first, in this order

1. **This document**, particularly sections 11 (product decisions), 9 (technical debt) and 17
   (project memory).
2. **`AGENTS.md`** — it instructs you to read `node_modules/next/dist/docs/` before writing
   code. **This is not optional and it has already prevented real mistakes.** Next 16 differs
   from most training data: error boundaries take `unstable_retry` not `reset`, middleware is
   `src/proxy.ts` not `middleware.ts`, and `_`-prefixed folders are non-routable.
3. **`git log`** — the commit messages are long-form and explain reasoning.

### What to investigate first

1. **Confirm the state matches this document.** Run `npm test`, `npm run lint`,
   `npx tsc --noEmit`, `npm run build`. If any differ from section 2, something changed after
   this was written — trust the repository, then update this file.
2. **Check whether OpenRouter credits were purchased.** Almost every priority depends on it:
   ```bash
   node --env-file=.env.local -e "const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.OPENROUTER_API_KEY},body:JSON.stringify({model:'google/gemini-2.5-flash',messages:[{role:'user',content:'hi'}],max_tokens:5})}); console.log(r.status, (await r.text()).slice(0,200))"
   ```
   402 means still no credits. 200 means credits exist — then set `AI_MODEL_DEFAULT` to the paid
   model and raise `AI_DAILY_REQUEST_BUDGET`.
3. **Ask whether the database was separated** and whether junk accounts were cleaned. Both were
   pending owner decisions.

### What to avoid

- **Do not restore any placeholder, sample or demo data** to user-facing or admin surfaces.
  Removing it took several phases.
- **Do not add paid-tier or subscription UI** until billing genuinely exists.
- **Do not make timeouts advance the AI model chain.** Read 11.4.
- **Do not reorder the tutor budget checks.** The order is a denial-of-service control (11.6).
- **Do not raise `AI_DAILY_REQUEST_BUDGET` above the provider's real cap.**
- **Do not accept `history` from the client** in `/api/ai-practice`.
- **Do not remove `releaseGuard()`** from the onboarding save paths.
- **Do not reintroduce `useSession()`** into the navigation components.
- **Do not put `FlagImage` inside a native `<option>`** — hydration error.
- **Do not "fix" `unstable_retry` to `reset`.**
- **Do not remove `migrateLegacyLevel` or `applyProfileMigrations`** — old documents still need
  them.
- **Do not remove `dns.setServers(...)` from `db.ts`** without investigating; it may be
  load-bearing on the owner's network.
- **Do not delete production data**, including junk accounts, without explicit approval.
- **Do not add a state-management library.** Nothing needs one.
- **Do not silence a lint error.** Seven of them turned out to be real bugs, and an eighth
  caught a cascading-render regression while the friends page was being converted.
- **Do not remove `sanitiseCustomCss`** from the theme path. See 11.25.
- **Do not sync a server prop into state with `useEffect`.** See 11.26.
- **Do not hard-code an AI provider or model outside `src/lib/ai/`**, and do not surface a
  provider name or model slug to users. See 18.1.
- **Do not claim support for a language pair that has not been tested**, and do not assume
  English as the instructional language. See 18.2.
- **Do not start building speech practice before the architecture and product plan in 18.2
  exists.**
- **Do not propose paid advertising before conversion tracking exists.** See 18.3.
- **Do not log an error object directly.** Use `reportServerError` / `internalErrorResponse`, or
  the redaction in 11.29 is bypassed and a connection string ends up in the logs. A bare
  `console.error(err)` in a new route is a regression, not a style preference.
- **Do not report from an error boundary when `error.digest` is set.** See 11.28.
- **Do not put `await connectDB()` back outside the try in `checkRateLimit`.** See 11.30.
- **Do not add the raw client address to a log record.** See 11.29.
- **Do not set `Permissions-Policy` to `camera=(), microphone=()`.** It would silently break the
  pre-join camera preview and live video (3.24, 3.35). Keep them scoped to `(self)`.
- **Do not add nonces to the CSP** without first re-deciding the caching trade-off in section 4
  — nonces require every page to render dynamically, which conflicts with the cached site
  palette. See 3.35.
- **Do not add `preload` to the `Strict-Transport-Security` header** without the owner's
  explicit sign-off — it requires submission to browsers' HSTS preload list and is effectively
  permanent. See 3.35.

### What not to rewrite

- **`src/lib/ai/openrouter.ts`** — subtle, well tested, hard-won.
- **`src/lib/rateLimit.ts`** — correct across instances, handles races, fails open.
- **`src/lib/ai/tutor-session.server.ts`** — the ownership scoping is a security control.
- **The messaging polling/realtime logic** — audited and correct. If you split the messages
  page for readability, **move** this code, do not reimplement it.
- **`src/lib/messages/reconcile.ts`** — small, correct, tested.
- **The middleware gate in `src/proxy.ts`** — it enforces auth, admin and onboarding together.

### What to improve

In priority order, matching section 12: **set `ERROR_REPORT_WEBHOOK_URL`** so the reports added
in `0d8c90b` reach a human (configuration, no code); then verify video and admin with real
access; then the owner-gated items (credits, database split, password reset); then analytics.
CSP and security headers are done (3.35).

### What requires the owner's approval

1. **Spending money** — OpenRouter credits, an email provider, a paid database tier.
2. **Any production data change** — deleting test accounts, resetting a password, editing user
   documents.
3. **The database migration** to separate dev from prod.
4. **Anything defining the paid tier** — what it includes is a business decision.
5. **Visual identity changes** — the brand mark was deliberately unified on the existing glyph
   rather than rebranding.
6. **Removing flags entirely** — considered and deferred, because language-to-nation mapping is
   editorially loaded (the data already maps Basque to the Spanish flag, Cantonese to Hong
   Kong). Raise it; do not decide it.

### How to prioritise future work

First check the work against **section 18** — it constrains what may be built at all. Then rank
by: **(a) does it unblock users, (b) does it prevent a silent failure, (c) does it reduce
risk to real data, (d) does it produce learning.** Polish comes last. Concretely, a fix that
makes a broken feature work beats a fix that makes a working feature faster, and both beat
visual refinement.

**Work in verified phases.** The workflow that produced this state: inspect → implement →
verify manually against a running server → `npm test` → `npm run lint` → `npx tsc --noEmit` →
`npm run build` → commit → push. **Manual verification is not optional** — it is how nearly
every severe bug in this project was found. And make sure your verification can actually fail;
several early checks in this project proved nothing (see 13).

---

## 17. Project memory

Everything here existed only in working memory and would otherwise be lost.

### Environment and access facts

- **Vercel project is named `voxa`**; the local directory is `LingoMatch`. They differ.
- **The Vercel CLI was never installed**, so `vercel env pull`, `vercel logs` and
  `vercel deploy` were unavailable throughout. Installing it is recommended.
- **The MongoDB database is literally named `test`** in the connection string.
- **Direct database writes from the shell were blocked** by tooling policy during this work, as
  was selecting the owner's authenticated browser context. This is why admin pages could not be
  clicked through — it was a genuine access limitation, not an oversight.
- Development was on Windows 11, which is *why* the flag-emoji problem was discovered at all:
  Segoe UI Emoji has no country glyphs, so 🇬🇧 rendered as "GB". A developer on macOS would
  never have seen it.
- Dev-server cold Turbopack compiles took 20–45s per route. Not a production characteristic; do
  not chase it as a performance problem.
- **MongoDB was unreachable from the shell during the `0d8c90b` work.** `resolveSrv` on the
  cluster returns `ECONNREFUSED`, because `db.ts` pins DNS to 8.8.8.8/8.8.4.4 and that traffic
  is blocked in that environment. The database itself was fine. If DB-backed flows suddenly
  appear broken, **check this before concluding anything about the application** — and do not
  "fix" it by deleting `dns.setServers`, which may be load-bearing on the owner's network.
- **A `next dev` process can outlive the shell that started it.** Stopping the background job
  left the server listening on 3000 and silently serving stale environment variables, which
  invalidated one verification run before it was noticed. Check `netstat -ano | grep :3000` and
  kill the PID directly. A second `next dev` refuses to start and says which PID holds the port.
- The dev server found running at the start of that session was an unresponsive husk of the fault
  described in section 14 — listening on 3000, answering nothing, logging `write EPIPE` on a
  loop. Killing and restarting it was the fix.
- Accounts created during this work, all in the shared production database:
  `qaftue001` / `qa.ftue.001@lingomatch.test`, `qaphase001` / `qa.phase.001@lingomatch.test`
  (both password `QaTest!2026`), plus `throttleprobe1` and `throttleprobe2` from rate-limit
  testing. `qaftue001` and `qaphase001` are friends and share one conversation with two
  messages, and `qaphase001` has five tutor sessions. **This is why Progress showed real data.**

### Reasoning that is not obvious from the code

**Why the free-model list is exactly those three.** All 17 free models on the live key were
benchmarked with a real tutor prompt. Most were unusable: my initial guesses at model slugs
(`google/gemini-2.0-flash-exp:free`, `meta-llama/llama-3.3-70b-instruct:free`,
`deepseek/deepseek-chat-v3-0324:free`) all 404'd — several with "This model is unavailable for
free. The paid version is available now". **Model slugs churn; re-benchmark rather than trusting
the list.** `openrouter/free` works but took 33 seconds. `google/gemma-4-26b-a4b-it:free` won on
quality *and* latency, producing Spanish with parenthetical English hints unprompted.

**Why the tutor budget default is 45 and not, say, 500.** The first implementation defaulted to
500. That was wrong and I corrected it after seeing the real header
(`X-RateLimit-Limit: 50`): a budget above the provider's own cap never fires, so users would
have met an opaque upstream 429 after three failed model attempts instead of a clear message.
The number is calibrated to a specific external fact and must move with it.

**Why the streak looks back exactly 30 days.** It bounds the only remaining unbounded document
scan in `getProgressSummary`. The number is a performance decision that happens to be a sensible
product one, not the reverse. Changing it changes query cost.

**Why `getActiveTutorSession` filters `'messages.0': { $exists: true }`.** Streaming forced
session creation *before* the first reply exists. Without that filter, a start that failed
mid-stream would leave a shell that the next page load would resume into as an empty chat. This
is a consequence of the streaming design, not an arbitrary guard.

**Why messages are stored even when a stream is interrupted.** The learner already read that
text; it is in their conversational context. Discarding it would make the next turn incoherent.

**Why the `(app)` error boundary exists separately from the root one.** So a broken page keeps
its navigation. A user stranded on a bare error screen has no way forward; one with a sidebar
does.

**Why `formatLevel` and `formatLevelWithMeaning` are both needed.** Pickers must teach what
"A1" means; compact badges have no room for it and the picker has already taught it. Collapsing
them would either clutter badges or restore the jargon.

**Why registration returns a specific conflict message.** Telling a user "username already
taken" versus a generic failure is a real usability gain, at the cost of enabling enumeration.
That trade-off was made consciously and is mitigated by the per-IP limit. If abuse appears,
genericise the message — do not assume it was an oversight.

**Why there is no CSP.** Not an oversight — it needs careful testing against LiveKit WebSocket
and WebRTC origins, Cloudinary, flagcdn, and Google OAuth. Getting it wrong breaks video
silently. It was correctly deferred rather than half-done.

### Ideas considered and deliberately abandoned

- **Removing flags entirely.** Genuinely tempting: language-to-nation mapping is editorially
  loaded, and the existing data maps Basque to 🇪🇸 and Cantonese to 🇭🇰. Abandoned because
  stripping a visual element across the whole product is an owner's decision, not an engineer's.
  **Raise it; do not act on it unilaterally.**
- **A shared `usePagedResource` hook** for the five paginated views. Abandoned as
  over-abstraction — the views differ enough (billing has two filters, database has dependent
  selection) that a shared hook would have needed escape hatches. Per-site derived loading state
  was simpler and equally correct.
- **Deleting old Cloudinary avatars in the same phase as the upload rate limit.** Deferred
  because it deletes user files, which deserves its own considered change rather than being
  bundled with a security fix.
- **Making the tutor's per-user daily limit configurable by env.** Skipped as premature; the
  global budget is the one that needs tuning.
- **Using SSE rather than NDJSON.** Rejected because the stream needs typed metadata events, and
  `EventSource` cannot send a POST body.
- **Standardising the brand glyph on `Languages` rather than `Mic`.** Five of six sites used
  `Mic`, so unifying on the minority would have been a rebrand disguised as a consistency fix.
- **Building real admin analytics.** Deliberately left as an honest placeholder because the
  events it would aggregate are not recorded. Building the page first would have meant inventing
  the numbers again.

### Hidden assumptions worth surfacing

- **Email addresses are the identity boundary.** Google login links to an existing
  email/password account automatically. If email ownership is not proven — and it is not, since
  `isVerified` is unenforced — this is an account-takeover path for someone who can register
  with a victim's address first.
- **A user has at most one resumable tutor session.** `startTutorSession` ends others. Multiple
  concurrent sessions would need a different resume UI.
- **A conversation has exactly two participants**, validated in the model. Group practice would
  require schema changes.
- **The rate limiter fails open.** A MongoDB outage disables all abuse protection. This was the
  right trade-off (don't lock out real users during an incident) but it is a trade-off.
- **`dailySessionCount` and `lastSessionDate` on `User` are unused.** They predate the current
  tutor budget, which uses the `RateLimit` collection instead. Do not wire them up without
  deciding which system owns per-user limits.
- **`compatibilityPct` on conversations comes from a hash of the two user ids**, not from real
  compatibility analysis. It is deterministic and stable but essentially decorative. It was left
  alone because it is not presented as a meaningful metric anywhere prominent — **but do not
  build features on it.**

### Things that look like bugs but are not

- **`(app)` pages returning HTML containing "We could not find"** — that is the shared
  `not-found` boundary present in the RSC payload, not a 404. Status is 200 and byte counts
  differ per page.
- **`npx tsc --noEmit` failing with "Cannot find module '.../page.js'"** after adding or
  deleting a route — stale generated types in `.next/types/`. Run `npm run build` once.
- **`/friends` server HTML lacking its heading** — it is client-fetched by design (known debt
  9.8), not broken.
- **`/verify-email` redirecting rather than 404ing for anonymous users** — it was removed from
  the middleware's public paths, so unauthenticated access redirects to login. Authenticated
  users get the branded 404. Both are correct.
- **Two `/api/auth/session` requests per page** — `SessionProvider` behaviour, known debt 9.10.

### Final note

The single most useful habit in this project was **driving the real application with two real
accounts**. Almost every severe defect — the dead tutor, the casing bug that broke all matching,
the unanswerable friend requests, the frozen long conversations, the camera preview that could
never display — was invisible in code review and obvious within minutes of actual use.

If you take one working practice from this handover, take that one.

---

## 18. Permanent product direction

**Status: binding constraints set by the owner, recorded 2026-07-30 (18.1–18.3) and extended
2026-07-30 (18.5).** These are not tasks in the current roadmap and none of them were
implemented in the error-observability or CSP blocks. They constrain how future architecture and
roadmap decisions are made. Read this section before proposing any change to the AI layer, the
language model configuration, the human-matching/session model, or the public-facing surface —
a design that violates one of these is wrong even if it is otherwise good.

**18.5 supersedes the "text conversation, with optional live video" framing in section 1** and in
3.9/3.11/3.24 as the long-term direction. Those sections still accurately describe what is
*built today* — do not rewrite them to describe a future state as current. Read 18.5 before
touching matching, messaging, video, or the AI tutor's product surface.

### 18.1 AI provider strategy

- **LingoMatch must not become tightly coupled to one AI provider or one model.** Providers and
  models will be added, removed, upgraded and replaced over time on the basis of quality,
  latency, reliability, language support and cost.
- **The architecture must support configurable provider and model routing, and future
  fallbacks, without a major rewrite.** The existing seams that already satisfy this and must be
  preserved: `resolveModelChain()` in `src/lib/ai/models.ts` (env-driven, ordered, deduplicated),
  the advance rules in `src/lib/ai/openrouter.ts`, and the fact that no SDK is used (11.20) so
  the HTTP boundary stays swappable.
- **Do not prematurely integrate many models at once.** Introduce a model when a real product
  need justifies it and the cost/quality trade-off has been verified — the same discipline that
  produced the current three-model free list by benchmarking all 17 candidates on the live key,
  not by guessing (section 17).
- **Provider names and model assumptions must not leak into core domain logic or the user
  experience.** A learner should never see "OpenRouter" or a model slug; domain code should ask
  for a tutor reply, not for a specific vendor.

*Consequence for the current code:* the OpenRouter-specific pieces are correctly confined to
`src/lib/ai/`. Keep them there. If a second provider is added, the split to make is
provider-adapter versus tutor-domain, mirroring the `CompatibilityProvider` seam already used
for matching (3.9).

### 18.2 Core AI language-teaching requirement

**The AI must directly teach a target language — not act as an English-based chatbot.**

- **English must not be a mandatory bridge language.** A user who speaks Spanish and does not
  understand English must be able to learn another supported language *in Spanish*.
- **Supported pairs should work in both directions** where model quality permits — Spanish →
  English and English → Spanish.
- **It is acceptable, and preferred, to launch with a limited set of carefully supported
  languages and pairs** rather than claiming to support every language. **Supported combinations
  must be explicit and based on tested quality**, not on the size of the language list in
  `src/constants/languages.ts`.
- **The eventual experience must include spoken conversation:** the learner speaks, the AI
  understands the speech, replies naturally, corrects mistakes appropriately, and teaches
  pronunciation, vocabulary, grammar and practical conversation **in the learner's known
  language**.
- **The teaching system must adapt** to the learner's level, goals, mistakes and progress —
  not behave like a generic assistant.

**Before this is implemented it needs an evidence-based architecture and product plan** covering
speech-to-text, text generation and reasoning, text-to-speech, pronunciation feedback,
language-pair support, latency, safety and usage cost. **Do not start building speech before
that plan exists.**

*Where the current code already points the right way:* `explanationLanguage` is part of the
saved language profile and is fed into the tutor prompt, so the instructional language is
already a real, per-user variable rather than an English default. `voiceIntro` on the `User`
model anticipates speech (3.24) but is unused. The honest current position is that the
per-pair *quality* has never been tested — only Spanish was exercised live — so the "explicit,
tested combinations" requirement is unmet today and should not be claimed.

### 18.3 SEO and acquisition

- **Public-facing SEO is a product requirement, not a cosmetic final task.**
- **Future public pages must use crawlable server-rendered content**, correct metadata,
  canonical URLs, structured data where appropriate, sitemap and robots handling, good
  performance, and genuinely useful language-learning content.
- **Authenticated application pages are not the SEO acquisition surface** and must not be
  mistaken for it. Everything under `(app)` sits behind the middleware auth gate in
  `src/proxy.ts` and is correctly invisible to crawlers.
- **The roadmap should eventually include public landing pages and useful indexable pages** for
  supported languages, language pairs and learning use cases — **while avoiding thin or
  auto-generated low-value pages.** A page per language pair is only worth publishing if it says
  something true and useful about that pair, which ties this requirement to 18.2: pages should
  exist for combinations the product actually supports well.
- **Paid advertising must not begin until the core onboarding and learning flow are measurable
  and conversion tracking is ready.** This depends on roadmap item 13 (product analytics).
- **Acquisition planning must consider SEO, content, referrals, social media and paid ads
  together**, rather than relying on advertising alone.
- **Advertising spend and channels must be chosen from real conversion and retention evidence**,
  not assumptions.

*Current position:* the only public pages are the landing page, login, register and
`/forgot-password`. No sitemap, no `robots.txt`, no structured data, and no canonical URLs
exist. That is a gap against this requirement, not a completed state — but it is deliberately
**not** work for the current block.

### 18.4 How these interact with the existing roadmap

None of section 12 is invalidated. The ordering guidance in 16 ("does it unblock users, does it
prevent a silent failure, does it reduce risk to real data, does it produce learning") still
governs *within* a release. Section 18 governs *what may be built at all*:

| Roadmap item | Effect of section 18 |
|---|---|
| 1 — buy AI credits, pin a paid model | Still correct, but pin it **through** `resolveModelChain()`; do not hard-code a vendor anywhere else (18.1) |
| 13 — product analytics | Becomes a **precondition for any paid advertising** (18.3), not only a learning tool |
| 17 — user blocking + moderation audit trail | **Re-prioritised upward by 18.5, and done** — see 3.36. Live voice between strangers cannot be reviewed after the fact the way a text transcript can; safety controls needed to exist *before* voice is the default experience, not after |
| 22 — payments | Unchanged; still requires demand evidence |
| 24 — speaking practice | **Requires the written architecture and product plan first** (18.2), which 18.5 now says must cover human-to-human voice matching as well as the AI tutor, not the tutor alone. This is the largest planned initiative in the project |
| — new | Public SEO surface (landing pages, sitemap, robots, structured data, per-pair content) is now an explicit future roadmap area (18.3) |
| — new | Voice-first human exchange (18.5): audio-first matching UX, a moderation model that assumes conversations are not reviewable after the fact, and demoting text to a supporting role — see 18.5 for what this does and does not authorise building now |

### 18.5 Voice-first human exchange (primary interaction model)

**Status: binding, recorded 2026-07-30. Not implemented. Does not authorise starting
implementation on its own — see "What this block does not do" below.**

**The owner's direction:** text messaging between users must stop being the primary way people
practise together. The product's centre of gravity moves to **live, real-time voice
conversation between learners**. Text chat continues to exist, but only as a **supporting**
feature — sharing a word, a link, a correction, a translation, a note — not as the thing the
architecture is organised around. Optional video (3.24) is unaffected by this and remains
optional; this direction is about audio being the default *human exchange* mode, not about
making video mandatory.

This extends, and does not replace, 18.2's existing requirement that the **AI tutor** eventually
become a spoken conversation partner. 18.2 was written about the AI tutor specifically; 18.5
applies the same shift to **human-to-human** matching, which 18.2 did not previously cover.

**Why this is a binding architectural constraint, not a UI reskin:**

- **Matching.** `MatchRequest`/`Conversation` currently model exactly two live modes: `chat`
  (text, no urgency) and `video` (live, ghost-detected, 12s liveness threshold). Voice-first
  means the *default* queue a user lands in should behave like `video`'s liveness model — a
  live two-party session — not like `chat`'s asynchronous one. Concretely this points toward a
  third session type (`voice`: an audio-only LiveKit room, i.e. `video` minus the camera track,
  not a new realtime vendor) sharing `video`'s matching liveness mechanics rather than `chat`'s.
  **Text as support means the existing per-user LiveKit data-room message channel (3.11) is the
  right transport for in-call text** — sharing a word or correction during a live voice
  session — rather than building a second text system.
- **Liquidity gets harder, not easier.** Section 10 already names two-sided liquidity as the
  biggest matching risk for *video*, which is optional today. Making a live-session mode the
  *primary* mode means that risk now applies to the primary experience, not an optional extra.
  The AI tutor's role as "the always-available floor" (section 1) becomes more important, not
  less, as the human-matching liquidity bar rises — **do not deprioritise the AI tutor while
  building this.**
- **Moderation is the load-bearing prerequisite, not an afterthought.** A text conversation
  leaves a transcript an admin can review after a report. A live voice call, by default, leaves
  nothing — reviewing "what was said" would require recording and storing audio of strangers
  talking to each other, which is its own consent/privacy/legal question this direction does
  **not** resolve and should not be assumed. Until that question is answered, moderation for
  voice has to be **preventive** (who can reach whom at all) rather than **retrospective**
  (review a transcript after a report). That is precisely what blocking and a moderation audit
  trail are for — see roadmap #17, now re-prioritised (18.4) — and it is why this block
  implements that item rather than voice matching itself: shipping a primary voice-matching mode
  with no working block/report loop and no accountable admin action log would put strangers in
  live audio with each other with weaker safety tooling than the text product already has today.
- **AI tutoring.** No change to 18.1 (provider independence) or 18.2's core requirement (teach in
  the learner's own language, no mandatory English bridge). 18.5 adds that when the tutor's
  speech capability (roadmap #24) is built, the same STT/LLM/TTS pipeline consideration and the
  same "an evidence-based plan before code" gate apply, and that plan should now design the tutor
  and human-to-human voice as one coherent audio product surface (shared audio infrastructure,
  shared moderation assumptions) rather than two unrelated features that happen to both use a
  microphone.
- **Infrastructure.** No new realtime vendor is implied — LiveKit already carries both audio and
  video tracks, so an audio-only room is a client/room-config change, not a new integration. A
  speech-to-text and text-to-speech vendor for the AI tutor's future voice capability **is** new,
  and 18.1's provider-agnosticism applies to it exactly as it applies to the LLM: no hard-coded
  vendor, no leaking a vendor/model name into the product surface.
- **UX.** The dashboard's current framing — "Text Practice" and "Live Practice" as co-equal cards
  (3.14), "practise your way … text-first, video optional" (section 1) — is the thing this
  direction eventually overturns. **Do not reword the dashboard or landing copy to claim a
  voice-first product before voice matching exists** (11.2's rule against fiction applies here
  exactly as it did to the old `/subscription` page); update the copy in the same implementation
  block that ships the capability, not before.
- **SEO (18.3).** Unaffected in mechanism, but future public landing/content pages should be
  written to describe live voice conversation practice once that is real, not text messaging —
  a content detail for whenever that page-writing work happens, not for this block.

**What this block does not do:** it does not add a `voice` match/session type, does not change
the dashboard or landing copy, and does not start the AI tutor speech work. Per 18.2, that
requires its own evidence-based architecture and product plan first — and per this section, that
plan must now scope human-to-human voice matching alongside the tutor. **What this block does
do** is update this passport with the direction and act on the one piece of preparatory work that
is genuinely evidence-justified today and has no owner-approval dependency: user blocking and a
moderation audit trail (roadmap #17), because voice-first raises the cost of shipping without it.
