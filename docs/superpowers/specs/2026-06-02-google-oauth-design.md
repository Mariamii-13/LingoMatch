# Google OAuth Design

## Goal
Add Google sign-in/sign-up to LingoMatch alongside existing credentials auth.

## Approach
Extend existing NextAuth v5 config with Google provider. Handle user creation/linking via `signIn` and `jwt` callbacks — no DB adapter required.

## Files Changed
- `.env.local` — add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `src/auth.ts` — add Google provider + `signIn`/`jwt` callbacks
- `src/app/(auth)/login/page.tsx` — wire Google button
- `src/app/(auth)/register/page.tsx` — wire Google button

## Auth Flow

### New Google user
1. Click "Sign in with Google"
2. Google redirects back with profile (email, name, image)
3. `signIn` callback: no existing user found → create User with auto-generated username (email prefix + random 4-digit suffix if collision), `googleId`, `avatar` from Google, `isVerified: true`, `passwordHash: null`
4. `jwt` callback: fetch DB user by email, populate `id`, `username`, `plan`, `role`, `onboardingCompleted` into token
5. Redirect to `/dashboard` (onboarding redirect handled by app layout)

### Existing credentials user (same email)
1. `signIn` callback: user found, `googleId` is null → set `googleId` on existing doc (account linking)
2. Rest same as above

### Returning Google user
1. `signIn` callback: user found with matching `googleId` → no-op, return true
2. `jwt` callback: fetch DB user, populate token

## Username Generation
`email.split('@')[0]` → strip non-alphanumeric → truncate to 20 chars → check collision → append random 4-digit suffix if taken, retry up to 10 times.

## No Adapter
JWT strategy kept. DB queries only on first sign-in per session (when `account` is present in jwt callback).
