# LingoMatch — Active Plan

This file tracks the current execution queue only. `PROJECT_PASSPORT.md` is the
source of truth for product state, architecture and the full roadmap (§12) —
read it first if anything here is unclear. This file's job is just to say
what's being worked on right now and what's next.

## Queue

- [x] **Phase 1 — Backwards pagination through message history** (roadmap #19)
      Users could only ever see the newest 100 messages in a conversation. Add
      a `before` cursor to `GET /api/chat/[sessionId]/messages` and wire the
      client to load older messages on scroll-to-top.
- [x] **Phase 2 — Split the 774-line messages page** (roadmap #16)
      Move the polling/realtime logic out of
      `src/app/(app)/messages/[conversationId]/page.tsx` into a hook, without
      rewriting the behavior.
- [x] **Phase 3 — Reduce the `jwt` callback DB read** (roadmap #20)
      Lowest priority of the three code-only items; accepts delayed ban
      propagation as the tradeoff. Pick up after 1 and 2 are verified.
- [x] **Phase 4 — AI & voice strategy review** (PROJECT_PASSPORT.md §19, roadmap #1/#24/#28-30)
      First-principles reassessment of the AI provider/model/voice strategy,
      requested by the owner. Researched current (Jul 2026) model pricing,
      latency and multilingual quality; the voice architecture question
      (S2S vs cascaded vs half-cascade); and initial language-pair scope.
      Wrote it all into §19. Configured (not yet usable — needs owner
      credits) the recommended text-model chain. See log below.
- [ ] **Phase 5 — Machine-check the explanation-language rule** (roadmap #28, §19.6.1)
      Structured tutor output + server-side language-ID check + repair call,
      instead of trusting the model to volunteer compliance. Highest-leverage
      item from the strategy review; no owner action needed. Next up.
- [ ] **Phase 6 — AI-quality eval harness** (roadmap #29, §19.6.2)
      Synthetic 20-turn sessions per Tier-1 language pair (§19.5), graded
      automatically, so future model swaps are verified, not guessed at.
- [ ] **Phase 7 — Cost-based tutor budget** (roadmap #30, §19.6.3)
      `tutor-budget.ts` counts requests today; needs a cost dimension before
      the paid chain configured in Phase 4 is trusted with real credits.

## Explicitly not in this queue

Everything else in PROJECT_PASSPORT §12 that needs the owner first — buying
AI credits, separating dev/prod databases, an admin account, an email
provider, payments. Don't start those without the owner in the loop.

## Log

- 2026-07-30 — Replaced the old SpeakFirst-template plan.md (10-week
  from-scratch blueprint that no longer matches the built product) with this
  tracker. See PROJECT_PASSPORT.md §16/§17/§18 for why and for binding
  product-direction constraints.
- 2026-07-30 — User-reported bug: AI tutor unreliable at correcting mistakes
  and at teaching a native-language-only learner (no English bridge).
  Investigated live (not just code review) and found two real, distinct
  issues:
  1. **Fixed, code**: `AIPracticeClient`'s "New session" reset the view but
     not `settings.targetLanguageCode`, so ending a session started under a
     language later removed from the profile left the setup form silently
     submitting an invalid, stale language code — a reproducible dead end
     (`INVALID_TARGET_LANGUAGE`, 400) with no visible cause to the user.
     Fixed in `use-conversation-thread`'s sibling `AIPracticeClient.tsx`;
     regression test added.
  2. **Improved, not resolved: free-model instruction-following.** Live-tested
     native=Spanish/target=French: the tutor corrected the mistake but
     explained the grammar rule in French, unreadable to a Spanish-only
     learner — confirmed live, matches PROJECT_PASSPORT.md §18.2's own caveat
     that non-English language pairs are untested. Tightened
     `src/lib/ai/prompts.ts` (explicit per-step instruction, a checklist item,
     and a worked example that demonstrates the language switch) — live
     retest showed the explanation moved from 0% to mostly-Spanish. Model
     still occasionally drifts. **The real fix is roadmap #1** (buy OpenRouter
     credits, switch off the free tier) — small free models are the
     structural limit here, not the prompt. Flagged to the user as an owner
     decision.
- 2026-07-31 — Owner asked for a full first-principles AI/voice strategy
  review before further AI work (not another prompt patch). Delegated the
  research to an Opus-backed agent with live web search (current pricing
  changes monthly; stale training data would be fiction). Independently
  re-verified the two concrete model picks live against OpenRouter and the
  account's real credit balance before writing anything down. Full reasoning
  is in PROJECT_PASSPORT.md §19 — key outcomes:
  - **Diagnosis**: the explanation-language defect found yesterday is a
    published, known failure class (instruction drift under a long
    multi-rule prompt across turns), not specific to our prompt wording.
  - **Text model**: recommended chain configured in `.env.local`
    (`gemini-3-flash-preview` → `claude-haiku-4.5` → existing free tier).
    Verified live: both paid entries currently 402 (no credits, as expected)
    and the chain correctly falls through to the free tier in well under a
    second — safe to leave configured now, ready the moment credits exist.
    Roadmap #1 unchanged as the highest-value owner action.
  - **Voice**: recommended architecture is half-cascade (not full
    speech-to-speech) — S2S is the most vendor-locked option, can't reliably
    guarantee the explanation-language rule (Gemini's own docs: native audio
    "automatically choose[s] the appropriate language," no override), and
    caps voices at ~10-30 fixed options vs. constraint 18.4's multi-persona
    requirement. Planning only — not implemented; one measurement spike
    (real latency, real accented-speech STT error rate) still needed before
    any voice code starts.
  - **Language scope**: recommended Tier 1 is 3 native languages (Spanish,
    English, Brazilian Portuguese) × up to French/Spanish/English targets,
    deliberately excluding non-Latin scripts at launch — full reasoning and
    the 8-pair table are in §19.5.
  - Did **not** do the bigger structured-output/eval-harness/cost-budget
    implementation work this same turn — each is real, multi-file work
    that deserves its own pass, not a rush at the end of a planning-heavy
    session. Queued as Phases 5–7 above.
