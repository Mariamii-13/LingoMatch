# Password Reset via Email — Design

## Problem

LingoMatch has no way for a user to recover access after forgetting their
password. `/forgot-password` is currently a static page stating the feature
isn't available. `PROJECT_PASSPORT.md` §3.26 documents this gap as roadmap
item #7 (Critical), blocked on having an email provider. This spec closes
that gap using Nodemailer + Gmail SMTP.

## Data model

Add two fields to `User` (`src/lib/models/User.ts`):

- `resetTokenHash: string | null` — SHA-256 hex digest of the raw reset
  token. The raw token is never stored.
- `resetTokenExpiresAt: Date | null` — expiry, 1 hour from issuance.

No new collection. Mirrors the existing `passwordHash` field pattern —
Mongoose is schemaless at the DB level, so this is a pure code change with
no migration step.

## Token mechanics

- Raw token: `crypto.randomBytes(32).toString('hex')` (256 bits of entropy).
- Only `sha256(rawToken)` is persisted. The raw token exists only in the
  email link and the client's reset-password request body.
- Expiry: 1 hour, enforced at verify time (`resetTokenExpiresAt > now`).
- Single-use: both fields are cleared to `null` immediately on successful
  reset, before responding.

## Endpoints

Both are Next.js App Router Route Handlers, following the conventions in
`src/app/api/auth/register/route.ts` (zod validation, `internalErrorResponse`
for opaque 500s with a correlation id).

### `POST /api/auth/forgot-password`

1. Zod-validate `{ email }`.
2. Rate-limit via a new `allowPasswordResetRequest(email, ip)` wrapper in
   `src/lib/auth-throttle.ts` (pattern copied from `allowLoginAttempt` /
   `allowRegistration`): 3 requests / email / hour, 10 / ip / hour.
3. Look up user by email (case-insensitive, matching existing schema).
4. If found: generate token, persist hash + expiry, send the reset email.
   This applies even to Google-only accounts (no existing `passwordHash`) —
   completing the reset sets their first password.
5. **Always return the same generic 200** (`{ message: "If an account
   exists for that email, a reset link has been sent." }`) regardless of
   whether a user was found or an email was actually sent — prevents
   account enumeration via response differences.
6. Rate-limit rejections also return the same generic 200 (do not leak
   throttling state to the client).

### `POST /api/auth/reset-password`

1. Zod-validate `{ token, password }`. Password rules reuse the existing
   policy from `src/lib/validations/auth.ts` (`RegisterSchema`'s password
   field).
2. Rate-limit by IP (reuses the general throttle pattern) to slow down
   token brute-forcing.
3. Hash the incoming token with SHA-256, look up a user with matching
   `resetTokenHash` and `resetTokenExpiresAt > now`.
4. No match → generic 400 `{ error: "Invalid or expired reset link." }`
   (does not distinguish "wrong token" from "expired" — no useful signal
   to an attacker either way).
5. Match → `bcrypt.hash(password, 12)`, set `passwordHash`, clear
   `resetTokenHash`/`resetTokenExpiresAt`, save. Return 200.

## Email delivery

New `src/lib/mail.ts`:

- Nodemailer transporter, `service: 'gmail'`, auth from
  `process.env.GMAIL_USER` / `process.env.GMAIL_APP_PASSWORD`.
- Transporter created lazily (module-level singleton, first send call).
- Missing env vars → throw at send time. This is surfaced through
  `internalErrorResponse` as an opaque 500, **not** a silent no-op —
  unlike the optional-integration pattern used for the observability
  webhook, email delivery is core to this feature and failures must be
  visible in logs/monitoring, not swallowed.
- Reset link: `${process.env.AUTH_URL}/reset-password?token=<rawToken>`.
- Plain-text + minimal HTML body. No tracking pixels, no third-party
  assets.

## Frontend

- Rebuild `src/app/(auth)/forgot-password/page.tsx`: email input form,
  posts to `/api/auth/forgot-password`, shows the generic success message
  on any non-network response (so the UI itself doesn't leak account
  existence either).
- New `src/app/(auth)/reset-password/page.tsx`: reads `?token=` from the
  URL, form for new password + confirmation, posts to
  `/api/auth/reset-password`, redirects to `/login` on success with a
  success notice.
- Add `/reset-password` to the public-paths list in `src/proxy.ts`
  (`/forgot-password` is already public).

## Secrets

- `GMAIL_USER` / `GMAIL_APP_PASSWORD` live only in `.env.local`
  (already covered by the repo's blanket `.env*` gitignore rule).
- A new `.env.example` will be added documenting variable **names only**
  (placeholder values, e.g. `GMAIL_USER=`), since none exists in the repo
  today. Real credentials are never written to `.env.example`, source
  code, logs, or documentation.

## Testing

Vitest, mirroring `src/lib/auth-throttle.test.ts`:

- Token generation/hashing/expiry helper logic (pure functions, easy to
  unit test without a DB).
- `allowPasswordResetRequest` rate-limit wrapper.
- Route handler tests for both endpoints (happy path, expired/invalid
  token, rate-limited, malformed input), with `sendMail` mocked so tests
  don't perform real network sends.
- Manual end-to-end verification (real Gmail send, real token round-trip)
  is done separately against the running dev server, not as part of the
  automated suite.

## Out of scope

- Email verification on signup (separate roadmap item, not this spec).
- Alternate email providers (Resend, SES) — Gmail SMTP only, per request.
- "Forgot password" rate-limit tuning beyond the numbers above (can be
  revisited later based on real abuse patterns).
