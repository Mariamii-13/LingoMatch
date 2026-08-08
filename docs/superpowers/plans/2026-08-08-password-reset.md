# Password Reset via Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user recover a forgotten password through a single-use, time-limited reset link emailed via Gmail SMTP (Nodemailer).

**Architecture:** Two new Route Handlers (`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`) delegate to a new `password-reset.server.ts` service module, following the existing `referral.server.ts` pattern: thin route, testable service, mocked DB/mail in unit tests. A new `mail.ts` wraps Nodemailer. Two new `User` fields (`resetTokenHash`, `resetTokenExpiresAt`) carry token state — no new collection.

**Tech Stack:** Next.js 16 App Router Route Handlers, Mongoose, Nodemailer (Gmail SMTP), zod, bcryptjs, Vitest.

## Global Constraints

- Gmail credentials (`GMAIL_USER`, `GMAIL_APP_PASSWORD`) live **only** in `.env.local` — never in source, logs, `.env.example`, or documentation. `.env.local` is already covered by the repo's `.env*` gitignore rule (`.gitignore:34`).
- Reset token: `crypto.randomBytes(32).toString('hex')`; only its SHA-256 hash is ever persisted.
- Token expiry: 1 hour, enforced at verify time.
- Token is single-use: cleared on successful reset.
- `POST /api/auth/forgot-password` always returns the same generic 200 body, whether or not the account exists and whether or not the request was rate-limited — no enumeration signal.
- Email send failures (bad/missing Gmail credentials, SMTP error) are **not** swallowed — they propagate to `internalErrorResponse` (opaque 500 + logged correlation id), because email delivery is core to this feature, unlike the optional observability webhook.
- Password rules for the new password reuse the existing policy: 8–100 characters (`RegisterSchema.password` in `src/lib/validations/auth.ts:16-19`).
- New backend code follows existing conventions exactly: zod `safeParse` + first-issue error message (`src/app/api/auth/register/route.ts:22-29`), `internalErrorResponse(scope, error)` for 500s (`src/lib/observability/report.server.ts:73-81`), `bcrypt.hash(password, 12)` (`src/app/api/auth/register/route.ts:44`), rate-limit wrappers in `src/lib/auth-throttle.ts` built on `checkRateLimit`/`hashSubject`.

---

### Task 1: Install Nodemailer

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: `nodemailer` importable as `import nodemailer from 'nodemailer'` for Task 5.

- [ ] **Step 1: Install the package**

Run: `npm install nodemailer@^9.0.5`

- [ ] **Step 2: Verify it resolves**

Run: `npm ls nodemailer`
Expected: prints `nodemailer@9.0.5` (or newer 9.x), no `UNMET DEPENDENCY`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add nodemailer for password-reset email delivery"
```

---

### Task 2: Add reset-token fields to the User schema

**Files:**
- Modify: `src/lib/models/User.ts:81` (near `passwordHash`) and `:146-157` (index block)

**Interfaces:**
- Produces: `User` documents gain `resetTokenHash: string | null` and `resetTokenExpiresAt: Date | null`, both defaulting to `null`. Consumed by Task 6.

- [ ] **Step 1: Add the fields**

In `src/lib/models/User.ts`, right after the `passwordHash` field (line 81):

```ts
    passwordHash: { type: String, default: null },
    // Password reset (roadmap #7): SHA-256 hash of the single-use reset
    // token, never the raw token. Cleared on successful reset or once
    // resetTokenExpiresAt has passed.
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null },
```

- [ ] **Step 2: Add a sparse index for the token lookup**

After the existing index block (after line 157, before the `export default` line):

```ts
// Sparse: most users have no active reset token, so this stays small.
UserSchema.index({ resetTokenHash: 1 }, { sparse: true })
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `User.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/models/User.ts
git commit -m "feat: add reset-token fields to User schema"
```

---

### Task 3: Add validation schemas

**Files:**
- Modify: `src/lib/validations/auth.ts`

**Interfaces:**
- Produces: `ForgotPasswordSchema` (`{ email: string }`), `ResetPasswordSchema` (`{ token: string; password: string }`), and inferred types `ForgotPasswordInput`, `ResetPasswordInput`. Consumed by Task 7 and Task 8.

- [ ] **Step 1: Add the schemas**

Append to `src/lib/validations/auth.ts`, after `LoginSchema`:

```ts
export const ForgotPasswordSchema = z.object({
  email: z
    .string({ error: (i) => i.input === undefined ? 'Email is required' : 'Email must be a string' })
    .email({ error: 'Please enter a valid email address' }),
})

export const ResetPasswordSchema = z.object({
  token: z
    .string({ error: (i) => i.input === undefined ? 'Reset token is required' : 'Token must be a string' })
    .min(1, { error: 'Reset token is required' }),
  password: z
    .string({ error: (i) => i.input === undefined ? 'Password is required' : 'Password must be a string' })
    .min(8, { error: 'Password must be at least 8 characters' })
    .max(100, { error: 'Password must be at most 100 characters' }),
})
```

And extend the type-export line:

```ts
export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations/auth.ts
git commit -m "feat: add forgot/reset password validation schemas"
```

---

### Task 4: Rate-limit wrappers for password reset

**Files:**
- Modify: `src/lib/auth-throttle.ts`
- Test: `src/lib/auth-throttle.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `checkRateLimit(action, subject, limit, windowSecs)` from `src/lib/rateLimit.ts:14-19`; `hashSubject(value)` from `src/lib/request-identity.ts:28-31`.
- Produces: `allowPasswordResetRequest(email: string, ip: string): Promise<boolean>` and `allowPasswordResetAttempt(ip: string): Promise<boolean>`, plus exported constants `PASSWORD_RESET_REQUESTS_PER_EMAIL`, `PASSWORD_RESET_REQUESTS_PER_IP`, `PASSWORD_RESET_WINDOW_SECS`, `PASSWORD_RESET_ATTEMPTS_PER_IP`, `PASSWORD_RESET_ATTEMPT_WINDOW_SECS`. Consumed by Task 7 (`allowPasswordResetRequest`) and Task 8 (`allowPasswordResetAttempt`).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/auth-throttle.test.ts` (add `allowPasswordResetRequest, allowPasswordResetAttempt, PASSWORD_RESET_REQUESTS_PER_EMAIL, PASSWORD_RESET_REQUESTS_PER_IP, PASSWORD_RESET_WINDOW_SECS, PASSWORD_RESET_ATTEMPTS_PER_IP, PASSWORD_RESET_ATTEMPT_WINDOW_SECS` to the existing import from `./auth-throttle`):

```ts
describe('allowPasswordResetRequest', () => {
  it('allows a request within both limits', async () => {
    allowAll()
    await expect(allowPasswordResetRequest('a@example.com', '1.2.3.4')).resolves.toBe(true)
  })

  it('applies the documented limits and window', async () => {
    allowAll()
    await allowPasswordResetRequest('a@example.com', '1.2.3.4')
    expect(checkRateLimit).toHaveBeenCalledWith(
      'password-reset-email',
      expect.any(String),
      PASSWORD_RESET_REQUESTS_PER_EMAIL,
      PASSWORD_RESET_WINDOW_SECS,
    )
    expect(checkRateLimit).toHaveBeenCalledWith(
      'password-reset-ip',
      expect.any(String),
      PASSWORD_RESET_REQUESTS_PER_IP,
      PASSWORD_RESET_WINDOW_SECS,
    )
  })

  it('blocks once the per-email limit is hit', async () => {
    denyOnly('password-reset-email')
    await expect(allowPasswordResetRequest('a@example.com', '1.2.3.4')).resolves.toBe(false)
  })

  it('blocks once the per-address limit is hit', async () => {
    denyOnly('password-reset-ip')
    await expect(allowPasswordResetRequest('a@example.com', '1.2.3.4')).resolves.toBe(false)
  })
})

describe('allowPasswordResetAttempt', () => {
  it('allows an attempt within the limit', async () => {
    allowAll()
    await expect(allowPasswordResetAttempt('1.2.3.4')).resolves.toBe(true)
  })

  it('applies the documented limit and window', async () => {
    allowAll()
    await allowPasswordResetAttempt('1.2.3.4')
    expect(checkRateLimit).toHaveBeenCalledWith(
      'password-reset-attempt-ip',
      expect.any(String),
      PASSWORD_RESET_ATTEMPTS_PER_IP,
      PASSWORD_RESET_ATTEMPT_WINDOW_SECS,
    )
  })

  it('blocks once an address has attempted too many resets', async () => {
    denyOnly('password-reset-attempt-ip')
    await expect(allowPasswordResetAttempt('1.2.3.4')).resolves.toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/auth-throttle.test.ts`
Expected: FAIL — `allowPasswordResetRequest is not a function` (or similar import error).

- [ ] **Step 3: Implement**

Append to `src/lib/auth-throttle.ts`:

```ts
export const PASSWORD_RESET_REQUESTS_PER_EMAIL = 3
export const PASSWORD_RESET_REQUESTS_PER_IP = 10
export const PASSWORD_RESET_WINDOW_SECS = 3600

/**
 * Whether a "send me a reset link" request may proceed.
 *
 * Same email-then-address shape as allowLoginAttempt: the email key stops
 * one inbox being spammed with reset links, the address key stops one
 * client from probing many emails. A denial here must not change the
 * response the caller sends — see forgot-password/route.ts.
 */
export async function allowPasswordResetRequest(email: string, ip: string): Promise<boolean> {
  const perEmail = await checkRateLimit(
    'password-reset-email',
    hashSubject(email),
    PASSWORD_RESET_REQUESTS_PER_EMAIL,
    PASSWORD_RESET_WINDOW_SECS,
  )
  if (!perEmail.allowed) return false

  const perIp = await checkRateLimit(
    'password-reset-ip',
    hashSubject(ip),
    PASSWORD_RESET_REQUESTS_PER_IP,
    PASSWORD_RESET_WINDOW_SECS,
  )
  return perIp.allowed
}

export const PASSWORD_RESET_ATTEMPTS_PER_IP = 20
export const PASSWORD_RESET_ATTEMPT_WINDOW_SECS = 300

/** Whether an address may submit another token+password reset attempt. */
export async function allowPasswordResetAttempt(ip: string): Promise<boolean> {
  const { allowed } = await checkRateLimit(
    'password-reset-attempt-ip',
    hashSubject(ip),
    PASSWORD_RESET_ATTEMPTS_PER_IP,
    PASSWORD_RESET_ATTEMPT_WINDOW_SECS,
  )
  return allowed
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth-throttle.test.ts`
Expected: PASS, all tests including pre-existing ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth-throttle.ts src/lib/auth-throttle.test.ts
git commit -m "feat: add password-reset rate-limit wrappers"
```

---

### Task 5: Gmail SMTP mail sender

**Files:**
- Create: `src/lib/mail.ts`
- Test: `src/lib/mail.test.ts`
- Create: `.env.example`

**Interfaces:**
- Consumes: `nodemailer` (Task 1); `process.env.GMAIL_USER`, `process.env.GMAIL_APP_PASSWORD`.
- Produces: `sendPasswordResetEmail(to: string, resetUrl: string): Promise<void>`, throws if Gmail credentials are missing. Consumed by Task 6.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/mail.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMail = vi.fn()
const createTransport = vi.fn(() => ({ sendMail }))

vi.mock('nodemailer', () => ({ default: { createTransport: (...args: unknown[]) => createTransport(...args) } }))

const { sendPasswordResetEmail } = await import('./mail')

describe('sendPasswordResetEmail', () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue(undefined)
    createTransport.mockClear()
    process.env.GMAIL_USER = 'bot@example.com'
    process.env.GMAIL_APP_PASSWORD = 'app-password'
  })

  it('sends through Gmail SMTP with the reset link in the body', async () => {
    await sendPasswordResetEmail('user@example.com', 'https://app.example.com/reset-password?token=abc123')

    expect(createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'bot@example.com', pass: 'app-password' },
    })
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        text: expect.stringContaining('https://app.example.com/reset-password?token=abc123'),
        html: expect.stringContaining('https://app.example.com/reset-password?token=abc123'),
      }),
    )
  })

  it('throws when GMAIL_USER is missing, instead of silently no-opping', async () => {
    delete process.env.GMAIL_USER
    await expect(sendPasswordResetEmail('user@example.com', 'https://x/y')).rejects.toThrow(
      /Gmail credentials/,
    )
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('throws when GMAIL_APP_PASSWORD is missing', async () => {
    delete process.env.GMAIL_APP_PASSWORD
    await expect(sendPasswordResetEmail('user@example.com', 'https://x/y')).rejects.toThrow(
      /Gmail credentials/,
    )
  })

  it('never includes the app password in the thrown error message', async () => {
    process.env.GMAIL_APP_PASSWORD = 'super-secret-value'
    delete process.env.GMAIL_USER
    await expect(sendPasswordResetEmail('user@example.com', 'https://x/y')).rejects.not.toThrow(
      /super-secret-value/,
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/mail.test.ts`
Expected: FAIL — cannot find module `./mail`.

- [ ] **Step 3: Implement**

Create `src/lib/mail.ts`:

```ts
import 'server-only'
import nodemailer from 'nodemailer'

/**
 * Sends the password-reset email over Gmail SMTP.
 *
 * Missing credentials throw rather than no-op: unlike the optional
 * observability webhook, email delivery is this feature's whole point, and
 * a swallowed failure here would mean reset links silently stop arriving
 * with nothing in the logs to explain why. The route handler that calls
 * this turns the throw into an opaque 500 via internalErrorResponse.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error('Gmail credentials are not configured (GMAIL_USER / GMAIL_APP_PASSWORD)')
  }

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })

  await transporter.sendMail({
    from: user,
    to,
    subject: 'Reset your LingoMatch password',
    text: `Reset your password by visiting this link:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email — your password will not change.`,
    html: `<p>Reset your password by clicking the link below:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, ignore this email — your password will not change.</p>`,
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/mail.test.ts`
Expected: PASS.

- [ ] **Step 5: Create `.env.example`**

Create `.env.example` at repo root (names only, no real values, never edit this file to add real secrets):

```
# Gmail SMTP (password reset emails). Real values go in .env.local only —
# never commit real credentials here. GMAIL_APP_PASSWORD is a Gmail App
# Password (Google Account -> Security -> 2-Step Verification -> App
# passwords), not your regular Gmail password.
GMAIL_USER=
GMAIL_APP_PASSWORD=
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/mail.ts src/lib/mail.test.ts .env.example
git commit -m "feat: add Gmail SMTP mail sender for password reset"
```

---

### Task 6: Password-reset service module

**Files:**
- Create: `src/lib/password-reset.server.ts`
- Test: `src/lib/password-reset.server.test.ts`

**Interfaces:**
- Consumes: `connectDB()` from `src/lib/db.ts`; `User` from `src/lib/models/User.ts` (needs `.findOne`, and documents need `.save()`); `sendPasswordResetEmail(to, resetUrl)` from Task 5; `bcrypt.hash` from `bcryptjs`; `process.env.AUTH_URL` / `process.env.NEXTAUTH_URL`.
- Produces:
  - `hashResetToken(rawToken: string): string`
  - `requestPasswordReset(email: string): Promise<void>` — no-op (no throw, no email) if no user matches; otherwise generates+saves a token and emails it, letting a send failure propagate.
  - `performPasswordReset(token: string, password: string): Promise<{ success: true } | { success: false; reason: 'invalid-or-expired' }>`
  - `RESET_TOKEN_TTL_MS: number`
  - Consumed by Task 7 (`requestPasswordReset`) and Task 8 (`performPasswordReset`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/password-reset.server.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const connectDB = vi.fn()
const findOne = vi.fn()
const sendPasswordResetEmail = vi.fn()
const bcryptHash = vi.fn()

vi.mock('./db', () => ({ connectDB: () => connectDB() }))
vi.mock('./models/User', () => ({ default: { findOne: (...args: unknown[]) => findOne(...args) } }))
vi.mock('./mail', () => ({ sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmail(...args) }))
vi.mock('bcryptjs', () => ({ default: { hash: (...args: unknown[]) => bcryptHash(...args) } }))

const { requestPasswordReset, performPasswordReset, hashResetToken, RESET_TOKEN_TTL_MS } =
  await import('./password-reset.server')

function fakeUser(overrides: Record<string, unknown> = {}) {
  return {
    email: 'user@example.com',
    resetTokenHash: null as string | null,
    resetTokenExpiresAt: null as Date | null,
    passwordHash: 'old-hash',
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

beforeEach(() => {
  connectDB.mockReset().mockResolvedValue(undefined)
  findOne.mockReset()
  sendPasswordResetEmail.mockReset().mockResolvedValue(undefined)
  bcryptHash.mockReset().mockResolvedValue('new-hash')
  process.env.AUTH_URL = 'https://app.example.com'
})

describe('hashResetToken', () => {
  it('is deterministic', () => {
    expect(hashResetToken('abc')).toBe(hashResetToken('abc'))
  })

  it('differs between tokens', () => {
    expect(hashResetToken('abc')).not.toBe(hashResetToken('xyz'))
  })

  it('never returns the raw token', () => {
    expect(hashResetToken('abc')).not.toBe('abc')
  })
})

describe('requestPasswordReset', () => {
  it('does nothing when no account matches the email', async () => {
    findOne.mockResolvedValue(null)
    await requestPasswordReset('nobody@example.com')
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('generates a token, saves its hash and expiry, and emails a link containing the raw token', async () => {
    const user = fakeUser()
    findOne.mockResolvedValue(user)

    await requestPasswordReset('user@example.com')

    expect(user.save).toHaveBeenCalled()
    expect(user.resetTokenHash).toBeTruthy()
    expect(user.resetTokenExpiresAt).toBeInstanceOf(Date)
    expect(user.resetTokenExpiresAt!.getTime()).toBeGreaterThan(Date.now())
    expect(user.resetTokenExpiresAt!.getTime()).toBeLessThanOrEqual(Date.now() + RESET_TOKEN_TTL_MS + 1000)

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1)
    const [to, resetUrl] = sendPasswordResetEmail.mock.calls[0] as [string, string]
    expect(to).toBe('user@example.com')
    expect(resetUrl).toMatch(/^https:\/\/app\.example\.com\/reset-password\?token=[0-9a-f]{64}$/)

    // The stored hash must correspond to the raw token in the emailed link.
    const rawToken = new URL(resetUrl).searchParams.get('token')!
    expect(user.resetTokenHash).toBe(hashResetToken(rawToken))
  })

  it('lets an email-send failure propagate, rather than swallowing it', async () => {
    findOne.mockResolvedValue(fakeUser())
    sendPasswordResetEmail.mockRejectedValue(new Error('smtp down'))
    await expect(requestPasswordReset('user@example.com')).rejects.toThrow('smtp down')
  })
})

describe('performPasswordReset', () => {
  it('rejects when no user matches the token (wrong or expired)', async () => {
    findOne.mockResolvedValue(null)
    const result = await performPasswordReset('bad-token', 'newpassword123')
    expect(result).toEqual({ success: false, reason: 'invalid-or-expired' })
    expect(bcryptHash).not.toHaveBeenCalled()
  })

  it('hashes the new password, clears the token, and saves', async () => {
    const user = fakeUser({ resetTokenHash: hashResetToken('good-token'), resetTokenExpiresAt: new Date(Date.now() + 1000) })
    findOne.mockResolvedValue(user)

    const result = await performPasswordReset('good-token', 'newpassword123')

    expect(result).toEqual({ success: true })
    expect(bcryptHash).toHaveBeenCalledWith('newpassword123', 12)
    expect(user.passwordHash).toBe('new-hash')
    expect(user.resetTokenHash).toBeNull()
    expect(user.resetTokenExpiresAt).toBeNull()
    expect(user.save).toHaveBeenCalled()
  })

  it('queries only for a non-expired token, so Mongo itself enforces expiry', async () => {
    findOne.mockResolvedValue(null)
    await performPasswordReset('some-token', 'newpassword123')
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        resetTokenHash: hashResetToken('some-token'),
        resetTokenExpiresAt: expect.objectContaining({ $gt: expect.any(Date) }),
      }),
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/password-reset.server.test.ts`
Expected: FAIL — cannot find module `./password-reset.server`.

- [ ] **Step 3: Implement**

Create `src/lib/password-reset.server.ts`:

```ts
import 'server-only'
import { randomBytes, createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { sendPasswordResetEmail } from '@/lib/mail'

/** 1 hour — short enough to limit exposure, long enough for a real email check. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

/** SHA-256 of the raw token. Only this is ever persisted or logged. */
export function hashResetToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

/**
 * Issues a reset token and emails it, if the email belongs to an account.
 *
 * Silently does nothing for an unknown email — the caller (the route
 * handler) always responds with the same generic message either way, so
 * this function's silence is what keeps account existence unobservable.
 * Works identically for Google-only accounts (no existing passwordHash):
 * completing the reset gives them their first password.
 *
 * An email-send failure is a real operational problem (misconfigured
 * Gmail, SMTP outage) and is deliberately NOT caught here — it propagates
 * so the route handler surfaces an opaque 500 instead of a false "sent".
 */
export async function requestPasswordReset(email: string): Promise<void> {
  await connectDB()
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return

  const rawToken = randomBytes(32).toString('hex')
  user.resetTokenHash = hashResetToken(rawToken)
  user.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS)
  await user.save()

  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`
  await sendPasswordResetEmail(user.email, resetUrl)
}

export type PasswordResetResult = { success: true } | { success: false; reason: 'invalid-or-expired' }

/**
 * Verifies a reset token and, if valid, sets it as the account's new
 * password. Single-use: the token fields are cleared in the same save
 * that sets the new passwordHash, so a second attempt with the same raw
 * token always falls into the "invalid-or-expired" branch.
 */
export async function performPasswordReset(token: string, password: string): Promise<PasswordResetResult> {
  await connectDB()
  const user = await User.findOne({
    resetTokenHash: hashResetToken(token),
    resetTokenExpiresAt: { $gt: new Date() },
  })
  if (!user) return { success: false, reason: 'invalid-or-expired' }

  user.passwordHash = await bcrypt.hash(password, 12)
  user.resetTokenHash = null
  user.resetTokenExpiresAt = null
  await user.save()

  return { success: true }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/password-reset.server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/password-reset.server.ts src/lib/password-reset.server.test.ts
git commit -m "feat: add password-reset token issue/verify service"
```

---

### Task 7: `POST /api/auth/forgot-password`

**Files:**
- Create: `src/app/api/auth/forgot-password/route.ts`
- Test: `src/app/api/auth/forgot-password/route.test.ts`

**Interfaces:**
- Consumes: `ForgotPasswordSchema` (Task 3), `allowPasswordResetRequest` (Task 4), `requestPasswordReset` (Task 6), `getClientIp` (`src/lib/request-identity.ts:11-18`), `internalErrorResponse` (`src/lib/observability/report.server.ts:73-81`).
- Produces: `POST` handler always returning `{ message: string }` with status 200 on any non-crash path, or the `internalErrorResponse` shape on a thrown error (e.g. email-send failure). Consumed by the frontend in Task 10.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/auth/forgot-password/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const allowPasswordResetRequest = vi.fn()
const requestPasswordReset = vi.fn()

vi.mock('@/lib/auth-throttle', () => ({
  allowPasswordResetRequest: (...args: unknown[]) => allowPasswordResetRequest(...args),
}))
vi.mock('@/lib/password-reset.server', () => ({
  requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  allowPasswordResetRequest.mockReset().mockResolvedValue(true)
  requestPasswordReset.mockReset().mockResolvedValue(undefined)
})

describe('POST /api/auth/forgot-password', () => {
  it('returns the generic message and issues a reset when the account exists', async () => {
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/reset link has been sent/i)
    expect(requestPasswordReset).toHaveBeenCalledWith('user@example.com')
  })

  it('returns the identical generic message when rate-limited, without attempting a reset', async () => {
    allowPasswordResetRequest.mockResolvedValue(false)
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.message).toMatch(/reset link has been sent/i)
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('rejects an invalid email with 400', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
    expect(requestPasswordReset).not.toHaveBeenCalled()
  })

  it('rejects a missing email with 400', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('surfaces a 500 when the reset/email pipeline actually fails', async () => {
    requestPasswordReset.mockRejectedValue(new Error('smtp down'))
    const res = await POST(makeRequest({ email: 'user@example.com' }))
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/auth/forgot-password/route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 3: Implement**

Create `src/app/api/auth/forgot-password/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { ForgotPasswordSchema } from '@/lib/validations/auth'
import { allowPasswordResetRequest } from '@/lib/auth-throttle'
import { getClientIp } from '@/lib/request-identity'
import { requestPasswordReset } from '@/lib/password-reset.server'
import { internalErrorResponse } from '@/lib/observability/report.server'

// Identical for every outcome except validation failure and a genuine
// server error — an existing account, a nonexistent one, and a
// rate-limited request must all look the same from the outside.
const GENERIC_RESPONSE = { message: 'If an account exists for that email, a reset link has been sent.' }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ForgotPasswordSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json({ error: issue?.message ?? 'Invalid input' }, { status: 400 })
    }
    const { email } = parsed.data

    const allowed = await allowPasswordResetRequest(email, getClientIp(req.headers))
    if (!allowed) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
    }

    await requestPasswordReset(email)
    return NextResponse.json(GENERIC_RESPONSE, { status: 200 })
  } catch (error) {
    return internalErrorResponse('auth/forgot-password POST', error)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/auth/forgot-password/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/forgot-password/route.ts src/app/api/auth/forgot-password/route.test.ts
git commit -m "feat: add POST /api/auth/forgot-password"
```

---

### Task 8: `POST /api/auth/reset-password`

**Files:**
- Create: `src/app/api/auth/reset-password/route.ts`
- Test: `src/app/api/auth/reset-password/route.test.ts`

**Interfaces:**
- Consumes: `ResetPasswordSchema` (Task 3), `allowPasswordResetAttempt` (Task 4), `performPasswordReset` (Task 6), `getClientIp`, `internalErrorResponse`.
- Produces: `POST` handler returning 200 on success, 400 on invalid input or invalid/expired token, 429 on rate limit. Consumed by the frontend in Task 10.

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/auth/reset-password/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const allowPasswordResetAttempt = vi.fn()
const performPasswordReset = vi.fn()

vi.mock('@/lib/auth-throttle', () => ({
  allowPasswordResetAttempt: (...args: unknown[]) => allowPasswordResetAttempt(...args),
}))
vi.mock('@/lib/password-reset.server', () => ({
  performPasswordReset: (...args: unknown[]) => performPasswordReset(...args),
}))

const { POST } = await import('./route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  allowPasswordResetAttempt.mockReset().mockResolvedValue(true)
  performPasswordReset.mockReset().mockResolvedValue({ success: true })
})

describe('POST /api/auth/reset-password', () => {
  it('returns 200 on a valid token and password', async () => {
    const res = await POST(makeRequest({ token: 'good-token', password: 'newpassword123' }))
    expect(res.status).toBe(200)
    expect(performPasswordReset).toHaveBeenCalledWith('good-token', 'newpassword123')
  })

  it('returns 400 for an invalid or expired token', async () => {
    performPasswordReset.mockResolvedValue({ success: false, reason: 'invalid-or-expired' })
    const res = await POST(makeRequest({ token: 'bad-token', password: 'newpassword123' }))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/invalid or expired/i)
  })

  it('returns 400 when the password is too short', async () => {
    const res = await POST(makeRequest({ token: 'good-token', password: 'short' }))
    expect(res.status).toBe(400)
    expect(performPasswordReset).not.toHaveBeenCalled()
  })

  it('returns 400 when the token is missing', async () => {
    const res = await POST(makeRequest({ password: 'newpassword123' }))
    expect(res.status).toBe(400)
  })

  it('returns 429 when rate-limited, without attempting the reset', async () => {
    allowPasswordResetAttempt.mockResolvedValue(false)
    const res = await POST(makeRequest({ token: 'good-token', password: 'newpassword123' }))
    expect(res.status).toBe(429)
    expect(performPasswordReset).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/auth/reset-password/route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 3: Implement**

Create `src/app/api/auth/reset-password/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { ResetPasswordSchema } from '@/lib/validations/auth'
import { allowPasswordResetAttempt } from '@/lib/auth-throttle'
import { getClientIp } from '@/lib/request-identity'
import { performPasswordReset } from '@/lib/password-reset.server'
import { internalErrorResponse } from '@/lib/observability/report.server'

export async function POST(req: NextRequest) {
  try {
    // Checked first, and cheaply, since a token-guessing script would
    // otherwise get unlimited bcrypt-cost attempts against every guess.
    if (!(await allowPasswordResetAttempt(getClientIp(req.headers)))) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = ResetPasswordSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json({ error: issue?.message ?? 'Invalid input' }, { status: 400 })
    }
    const { token, password } = parsed.data

    const result = await performPasswordReset(token, password)
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 })
  } catch (error) {
    return internalErrorResponse('auth/reset-password POST', error)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/app/api/auth/reset-password/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/reset-password/route.ts src/app/api/auth/reset-password/route.test.ts
git commit -m "feat: add POST /api/auth/reset-password"
```

---

### Task 9: Make `/reset-password` publicly reachable

**Files:**
- Modify: `src/proxy.ts:14`

**Interfaces:**
- Consumes: nothing new.
- Produces: `/reset-password` reachable while signed out, matching the existing `/forgot-password` entry.

- [ ] **Step 1: Add the path**

In `src/proxy.ts`, line 14:

```ts
  const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password']
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: make /reset-password reachable while signed out"
```

---

### Task 10: Frontend — forgot-password form and reset-password page

**Files:**
- Modify: `src/app/(auth)/forgot-password/page.tsx` (currently a static notice — replace entirely)
- Create: `src/app/(auth)/reset-password/page.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/forgot-password` (Task 7) — request `{ email }`, response `{ message }` (200) or `{ error }` (400/500). `POST /api/auth/reset-password` (Task 8) — request `{ token, password }`, response `{ message }` (200) or `{ error }` (400/429/500).
- Produces: two client pages, no exports consumed elsewhere.

This task is UI-only; verified manually in Task 12 (no unit test — the existing `register/page.tsx` this mirrors has none either).

- [ ] **Step 1: Rebuild the forgot-password page**

Replace the full contents of `src/app/(auth)/forgot-password/page.tsx`:

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      // Every non-crash response — found, not found, rate-limited — reads
      // the same generic message from the API. Only a real server error
      // (5xx) surfaces as an error here.
      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || "Something went wrong. Please try again.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {submitted ? (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-6 text-foreground">
          If an account exists for that email, a reset link has been sent. Check your inbox — the
          link expires in 1 hour.
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        </>
      )}

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Create the reset-password page**

Create `src/app/(auth)/reset-password/page.tsx`:

```tsx
"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// `useSearchParams()` (reading `?token=`) opts this page into client-side
// rendering up to the nearest Suspense boundary — same pattern as
// register/page.tsx's `?ref=` handling.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="rounded-xl border bg-card p-6 shadow-sm" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!token) {
      setError("This reset link is missing its token. Request a new one.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        return
      }
      router.push("/login?reset=true")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Set a new password</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose a new password for your account. This link works once and expires in 1 hour.
        </p>
      </div>

      {!token && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          This link is missing its token. Go back to{" "}
          <Link href="/forgot-password" className="font-medium underline">
            request a new one
          </Link>
          .
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm new password</Label>
          <Input
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <Button className="w-full" type="submit" disabled={loading || !token}>
          {loading ? "Updating..." : "Update password"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Add a "Forgot password?" link from the login page**

Read `src/app/(auth)/login/page.tsx` first to find its password field, then add a link next to the password `Label` (mirroring the `confirm` field styling in `register/page.tsx`) pointing to `/forgot-password`, e.g.:

```tsx
<div className="flex items-center justify-between">
  <Label htmlFor="password">Password</Label>
  <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
    Forgot password?
  </Link>
</div>
```

Adjust to match whatever the actual current `Label`/`Input` structure in that file is — this is the only step in the plan where the exact surrounding JSX must be read live rather than assumed, since login/page.tsx wasn't part of the earlier codebase exploration.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npx eslint src/app/\(auth\)/forgot-password/page.tsx src/app/\(auth\)/reset-password/page.tsx src/app/\(auth\)/login/page.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/forgot-password/page.tsx" "src/app/(auth)/reset-password/page.tsx" "src/app/(auth)/login/page.tsx"
git commit -m "feat: rebuild forgot-password form and add reset-password page"
```

---

### Task 11: Update PROJECT_PASSPORT.md

**Files:**
- Modify: `PROJECT_PASSPORT.md` (§3.26 area, around line 1268-1289, and the roadmap item #7 entry around line 4446)

**Interfaces:** none — documentation only.

- [ ] **Step 1: Read the current sections**

Read `PROJECT_PASSPORT.md` around lines 1260-1300 and 4440-4460 to get exact current wording before editing.

- [ ] **Step 2: Update §3.26**

Replace the "no email capability whatsoever" text with a factual description of what now exists: Nodemailer + Gmail SMTP (`src/lib/mail.ts`), the token issue/verify service (`src/lib/password-reset.server.ts`), the two endpoints, the 1-hour single-use token design, and that `GMAIL_USER`/`GMAIL_APP_PASSWORD` must be set in the deployment environment for it to function.

- [ ] **Step 3: Update roadmap item #7**

Mark roadmap item #7 ("Implement password reset") as shipped, matching the phrasing convention already used for other completed items elsewhere in the file (check how a recently-closed item, e.g. from the last few commits, is phrased and mirror it).

- [ ] **Step 4: Commit**

```bash
git add PROJECT_PASSPORT.md
git commit -m "docs: update PROJECT_PASSPORT.md for shipped password reset (roadmap #7)"
```

---

### Task 12: Full verification and push

**Files:** none (verification only).

- [ ] **Step 1: Full automated suite**

Run, in order, stopping to fix on any failure before continuing:
```bash
npx vitest run
npx eslint .
npx tsc --noEmit
npm run build
```
Expected: all four succeed.

- [ ] **Step 2: Confirm `.env.local` has real Gmail credentials**

Run: `Select-String -Path .env.local -Pattern "^GMAIL_USER=|^GMAIL_APP_PASSWORD="` (PowerShell) — confirm both keys are present. Do not print their values to any log, commit, or chat message.

- [ ] **Step 3: Start the dev server and drive the real flow in a browser**

Start `npm run dev`, then using the browser tooling:
1. Navigate to `/forgot-password`, submit the real Gmail test account's email.
2. Confirm the generic success message renders.
3. Check that account's real Gmail inbox for the delivered email (this is the live Gmail-delivery check — a real send through the configured `GMAIL_USER`/`GMAIL_APP_PASSWORD`, not a mock).
4. Open the link from the email — confirm it lands on `/reset-password?token=...` with the token populated.
5. Submit a new password; confirm redirect to `/login?reset=true`.
6. Log in with the new password; confirm it succeeds.
7. Re-open the same original reset link and submit again — confirm it now returns "Invalid or expired reset link." (single-use check).
8. Request a reset for the same email 4 times in under an hour — confirm the 4th still returns the generic success message (not a visible rate-limit error), and manually confirm in the database or logs that no 4th token/email was actually issued beyond the configured limit.
9. If a Google-only test account exists (or create one via Google sign-in), run the same forgot-password → email → reset-password flow for it and confirm login with the newly-set password succeeds afterward.

- [ ] **Step 4: Token expiry check**

Either wait out the 1-hour expiry against a real issued token, or temporarily point `RESET_TOKEN_TTL_MS` — via a short-lived local edit, reverted immediately after this check, never committed — to a few seconds, issue a token, wait for it to pass, and confirm `/api/auth/reset-password` returns "Invalid or expired reset link." for it.

- [ ] **Step 5: Push**

```bash
git push
```

Confirm `git log --oneline -1` and `git status` show a clean, pushed tree before reporting completion.
