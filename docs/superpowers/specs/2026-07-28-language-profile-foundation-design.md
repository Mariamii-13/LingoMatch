# Language Profile Foundation Design

## Goal

Make language learning a first-class, persisted domain concept that drives onboarding and AI tutoring while preserving all existing users, matching, profiles, and live-session behavior.

## Architecture

`User.languageProfile` becomes the canonical learning profile. It stores a versioned list of native language codes, a future-ready list of learning languages with one primary target, and the language used for tutor explanations. Existing `nativeLanguages`, `spokenLanguages`, and `learningLanguages` remain temporarily as compatibility fields because profile discovery and matching query them directly. All new language-profile writes update the canonical object and those compatibility fields together through one normalization function.

The canonical shape is:

```ts
type LanguageProfile = {
  version: 1
  nativeLanguages: string[]
  learningLanguages: Array<{
    code: string
    level: 'unsure' | 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'
    isPrimary: boolean
  }>
  preferredExplanationLanguage: string
  completedAt: Date
}
```

Language codes are normalized lowercase BCP-47-style identifiers backed by the existing language registry. Duplicate codes are rejected, native and target lists cannot overlap, exactly one target is primary, and the explanation language must be one of the native languages. The schema supports multiple native and target languages immediately; onboarding initially edits all of them and marks the first target as primary.

## Existing User Compatibility

A central server-only resolver reads either the canonical profile or the current language fields. Existing `spokenLanguages` entries marked `native` become native languages. Existing `learningLanguages` become targets; legacy levels are normalized and `beginner` maps to `unsure`. The first target becomes primary and the first native language becomes the explanation language.

Authenticated requests lazily persist this derived profile once. This avoids a breaking one-time deployment migration and means accounts migrate safely on their next authenticated request without losing old fields. Accounts whose old data is incomplete are sent through onboarding instead of receiving guessed values. Missing or malformed data never overwrites valid legacy data.

## Onboarding Enforcement

The existing `/languages` onboarding page becomes the required language-profile step. It collects native languages, target languages, CEFR level (including `I'm not sure`), and preferred explanation language. The skip action is removed. Existing onboarding steps and progress remain unchanged.

The JWT/session receives a `languageProfileComplete` boolean computed from canonical or compatible legacy data. `proxy.ts` redirects authenticated non-admin application page requests with an incomplete profile to `/languages`. Onboarding pages, auth APIs, user-profile APIs, static assets, and admin routes remain accessible so the profile can be completed and account recovery remains possible.

## AI Personalization

The client no longer supplies arbitrary language or level values. It loads the authenticated profile, allows selection only among the user's saved target languages, and submits a target language code plus practice mode. The route reloads the user from MongoDB and resolves native languages, target language, CEFR level, and explanation language server-side.

The tutor request receives:

- target language display name and code
- current CEFR level or `unsure`
- native language display names
- preferred explanation language display name
- existing mode, history, and learner message

The prompt speaks primarily in the target language and gives brief explanations in the preferred explanation language. An unsure learner is treated conservatively at A1/A2 complexity until the tutor has enough conversational evidence. The OpenRouter provider, model registry, timeout, token limit, and error mapping do not change.

## Future Matching Readiness

The profile shape supports native-to-target intersections, multiple targets, primary-target weighting, and partner recommendations without changing the user identity model. New indexes cover native codes, target codes, and primary target lookups. Existing matching continues using compatibility fields in this phase.

## Error Handling

All profile writes use Zod validation and return stable 400/401/404 responses. AI requests return 409 with a profile-specific code if no usable language profile exists and 400 if a requested target is not in the profile. Database/provider exceptions retain the existing route-level error policy.

## Testing

Unit tests cover profile normalization, legacy migration, completeness, compatibility writes, validation, prompt personalization, and AI request validation. Component tests cover profile-driven tutor setup and request payloads. Final verification runs TypeScript, ESLint, the full Vitest suite with constrained workers, and a production build.
