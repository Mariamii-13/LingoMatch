import 'server-only'
import { NextResponse } from 'next/server'
import { after } from 'next/server'

import {
  ERROR_LOG_PREFIX,
  buildErrorEvent,
  formatErrorLog,
  type BuildErrorEventInput,
  type ErrorOrigin,
  type ReportedErrorEvent,
} from './error-report'

/**
 * A slow webhook must not hold a serverless function open; three seconds is
 * long enough for a healthy endpoint and short enough to be invisible.
 */
const WEBHOOK_TIMEOUT_MS = 3000

export interface ServerReportOptions {
  /** Pre-allocated correlation id, when the caller has already shown one. */
  id?: string
  /** React's error digest, for failures that came out of a render. */
  digest?: string
  request?: BuildErrorEventInput['request']
  context?: Record<string, unknown>
}

function report(
  origin: ErrorOrigin,
  scope: string,
  error: unknown,
  options: ServerReportOptions
): string {
  const event = buildErrorEvent({ origin, scope, error, ...options })

  // stdout/stderr is the one sink that always exists: Vercel captures it with
  // no account, no key and no cost. Searching for `lm-error` in runtime logs
  // finds every failure the application knows about.
  console.error(formatErrorLog(event))
  scheduleDelivery(event)

  return event.id
}

/**
 * Records a server-side failure and returns its correlation id.
 *
 * The id is the whole point: a user can only ever report "it broke", and this
 * is what turns that into a specific line in the logs.
 */
export function reportServerError(
  scope: string,
  error: unknown,
  options: ServerReportOptions = {}
): string {
  return report('server', scope, error, options)
}

/** Records a failure that happened in the browser and was sent to the server. */
export function reportClientError(
  scope: string,
  error: unknown,
  options: ServerReportOptions = {}
): string {
  return report('client', scope, error, options)
}

/**
 * The 500 every route handler should return: opaque to the caller, but carrying
 * the id that matches it to the logged record.
 */
export function internalErrorResponse(
  scope: string,
  error: unknown,
  options: ServerReportOptions & { message?: string } = {}
): NextResponse {
  const { message = 'Internal server error', ...reportOptions } = options
  const errorId = reportServerError(scope, error, reportOptions)
  return NextResponse.json({ error: message, errorId }, { status: 500 })
}

/**
 * Optional forwarding to whatever the operator has configured — a Slack or
 * Discord incoming webhook today, a hosted error tracker later. Deliberately
 * provider-agnostic: no SDK, no account and no cost is required to run the app,
 * and setting one environment variable is enough to start receiving alerts.
 */
function scheduleDelivery(event: ReportedErrorEvent): void {
  const url = process.env.ERROR_REPORT_WEBHOOK_URL
  if (!url) return

  const deliver = () => sendToWebhook(url, event)

  try {
    // Runs after the response is flushed, so reporting never delays a user.
    after(deliver)
  } catch {
    // `after` throws outside a request scope (server start-up, background work).
    // Falling back keeps those failures reportable too.
    void deliver()
  }
}

async function sendToWebhook(url: string, event: ReportedErrorEvent): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    })
  } catch (err) {
    // The reporter must never become a second source of failure, and it must
    // not recurse through itself either — hence a plain one-line log.
    console.error(
      `${ERROR_LOG_PREFIX}-delivery failed for ${event.id}:`,
      err instanceof Error ? err.message : String(err)
    )
  }
}
