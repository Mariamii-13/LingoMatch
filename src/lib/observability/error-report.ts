/**
 * Shapes a failure into one structured, secret-free log record.
 *
 * This module is deliberately pure and isomorphic: the server reporter, the
 * `onRequestError` hook and the client-error endpoint all build the same record
 * so a single search term finds every failure regardless of where it happened.
 */

/** Every reported failure is logged behind this token, so one grep finds them all. */
export const ERROR_LOG_PREFIX = 'lm-error'

export const MAX_MESSAGE_LENGTH = 500
export const MAX_STACK_LENGTH = 4000

/**
 * Headers worth keeping. Everything else is dropped rather than filtered,
 * because an allow-list cannot be defeated by a header nobody anticipated.
 *
 * The client address is deliberately absent: it identifies a person, and a log
 * record is not the place to store one. Rate limiting already keys on a hash of
 * it (see src/lib/request-identity.ts) for exactly that reason.
 */
const SAFE_HEADERS = ['user-agent', 'referer', 'accept-language', 'content-type', 'x-vercel-id']

/**
 * Environment variables whose values must never reach a log line. Errors from
 * third parties routinely quote them back: a Mongoose connection failure
 * includes the whole connection string, password and all.
 */
const SECRET_ENV_VARS = [
  'MONGODB_URI',
  'AUTH_SECRET',
  'NEXTAUTH_SECRET',
  'OPENROUTER_API_KEY',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
]

/** Below this length a "secret" is too generic to search and replace safely. */
const MIN_REDACTABLE_SECRET_LENGTH = 8

export type ErrorOrigin = 'server' | 'client'

export interface ReportedErrorEvent {
  /** Correlation id. Quoted back to the user so a report maps to a log line. */
  id: string
  at: string
  origin: ErrorOrigin
  scope: string
  name: string
  message: string
  stack?: string
  /** React's own error digest, when the failure came from a render. */
  digest?: string
  path?: string
  method?: string
  headers?: Record<string, string>
  context?: Record<string, unknown>
}

export interface BuildErrorEventInput {
  origin: ErrorOrigin
  /** Where it happened, e.g. `api/friends POST` or `render /dashboard`. */
  scope: string
  error: unknown
  id?: string
  digest?: string
  request?: {
    path?: string
    method?: string
    headers?: Headers | Record<string, string | string[] | undefined>
  }
  context?: Record<string, unknown>
  /** Overridable for tests; defaults to the values in `process.env`. */
  secrets?: string[]
  now?: Date
}

/** 48 bits of randomness — enough to be unique in a log, short enough to read aloud. */
export function newErrorId(): string {
  const bytes = new Uint8Array(6)
  const webCrypto = globalThis.crypto
  if (webCrypto?.getRandomValues) {
    webCrypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function configuredSecrets(): string[] {
  return SECRET_ENV_VARS.map((name) => process.env[name] ?? '').filter(Boolean)
}

/**
 * Removes credentials from text that is about to be logged.
 *
 * Patterns come first because they catch secrets this deployment does not own —
 * a token belonging to a caller, say — and the configured values come second to
 * catch anything the patterns miss.
 */
export function redactSecrets(text: string, secrets: string[] = configuredSecrets()): string {
  if (!text) return ''

  let output = text
    // mongodb://user:pass@host and mongodb+srv://user:pass@host
    .replace(/(mongodb(?:\+srv)?:\/\/)[^:/@\s]+:[^@\s]+@/gi, '$1***:***@')
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [redacted]')
    // Provider api keys (OpenAI/OpenRouter shaped), wherever they are quoted.
    .replace(/\bsk-[A-Za-z0-9._-]{8,}/g, '[redacted-key]')

  for (const secret of secrets) {
    if (!secret || secret.length < MIN_REDACTABLE_SECRET_LENGTH) continue
    output = output.replace(new RegExp(escapeForRegExp(secret), 'g'), '[redacted]')
  }

  return output
}

export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** Normalises anything throwable into a name, a message and an optional stack. */
export function describeError(error: unknown): {
  name: string
  message: string
  stack?: string
} {
  if (error instanceof Error) {
    return { name: error.name || 'Error', message: error.message || '', stack: error.stack }
  }
  if (typeof error === 'string') {
    return { name: 'NonError', message: error, stack: undefined }
  }
  if (error === null || error === undefined) {
    return { name: 'NonError', message: String(error), stack: undefined }
  }
  let message: string
  try {
    message = JSON.stringify(error) ?? String(error)
  } catch {
    message = String(error)
  }
  return { name: 'NonError', message, stack: undefined }
}

/** Keeps only the allow-listed headers, lower-cased, with repeats joined. */
export function pickSafeHeaders(
  headers?: Headers | Record<string, string | string[] | undefined>
): Record<string, string> {
  const result: Record<string, string> = {}
  if (!headers) return result

  const entries: [string, string | string[] | undefined][] =
    typeof (headers as Headers).forEach === 'function' && !Array.isArray(headers)
      ? Array.from(headers as Headers)
      : Object.entries(headers as Record<string, string | string[] | undefined>)

  for (const [rawName, rawValue] of entries) {
    const name = rawName.toLowerCase()
    if (!SAFE_HEADERS.includes(name) || rawValue === undefined) continue
    result[name] = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue)
  }

  return result
}

export function buildErrorEvent(input: BuildErrorEventInput): ReportedErrorEvent {
  const { name, message, stack } = describeError(input.error)
  const secrets = input.secrets ?? configuredSecrets()

  const event: ReportedErrorEvent = {
    id: input.id ?? newErrorId(),
    at: (input.now ?? new Date()).toISOString(),
    origin: input.origin,
    scope: input.scope,
    name,
    message: truncate(redactSecrets(message, secrets), MAX_MESSAGE_LENGTH),
  }

  if (stack) event.stack = truncate(redactSecrets(stack, secrets), MAX_STACK_LENGTH)
  if (input.digest) event.digest = input.digest
  if (input.request?.path) event.path = input.request.path
  if (input.request?.method) event.method = input.request.method

  const headers = pickSafeHeaders(input.request?.headers)
  if (Object.keys(headers).length > 0) event.headers = headers

  if (input.context && Object.keys(input.context).length > 0) event.context = input.context

  return event
}

/**
 * Renders the event as a single line.
 *
 * One line matters: a raw stack trace spans dozens of lines, and log platforms
 * treat each as a separate record, so the interesting frames get separated from
 * the id that identifies them.
 */
export function formatErrorLog(event: ReportedErrorEvent): string {
  let body: string
  try {
    body = JSON.stringify(event)
  } catch {
    // A context value that cannot be serialised must not lose the whole record.
    body = JSON.stringify({ ...event, context: '[unserialisable]' })
  }
  return `${ERROR_LOG_PREFIX} ${body}`
}
