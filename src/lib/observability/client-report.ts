import type { ClientErrorReport } from '@/lib/validations/client-error'

/**
 * Sends browser failures to the server so they stop disappearing.
 *
 * A crash in the browser is invisible to every server log: the user sees a
 * broken screen, the server sees a perfectly successful page render. This is
 * the only path that closes that gap.
 */

export const CLIENT_ERROR_ENDPOINT = '/api/observability/client-error'

/**
 * A render loop can throw continuously. The endpoint is rate limited too, but
 * the cheapest place to stop a flood is before it leaves the browser.
 */
export const MAX_REPORTS_PER_PAGE_LOAD = 5

/**
 * What a cross-origin script failure looks like to `window.onerror`. It carries
 * no message, no stack and no file, identifies nothing, and is usually a
 * browser extension rather than this application.
 */
const OPAQUE_MESSAGES = ['script error.', 'script error']

let reportsSent = 0

/** Test seam: a page load resets the budget, and each test is a fresh page. */
export function resetClientReportBudget(): void {
  reportsSent = 0
}

export interface BrowserErrorInput {
  kind: ClientErrorReport['kind']
  error?: unknown
  /** Used when the failure arrived without an Error object. */
  message?: string
}

function describeNonError(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

export function buildClientReport(input: BrowserErrorInput): ClientErrorReport | null {
  const error = input.error
  const isError = error instanceof Error

  // A rejection can carry a plain string or an object, and that value says more
  // than the generic label the caller passed as a fallback.
  const described = isError ? error.message : describeNonError(error)
  const message = (described || input.message || '').trim()
  if (!message || OPAQUE_MESSAGES.includes(message.toLowerCase())) return null

  const report: ClientErrorReport = { kind: input.kind, message }

  if (isError) {
    if (error.name) report.name = error.name
    if (error.stack) report.stack = error.stack
    const digest = (error as Error & { digest?: string }).digest
    if (digest) report.digest = digest
  }

  if (typeof window !== 'undefined') {
    report.path = window.location.pathname + window.location.search
  }

  return report
}

export function reportBrowserError(input: BrowserErrorInput): void {
  try {
    if (reportsSent >= MAX_REPORTS_PER_PAGE_LOAD) return

    const report = buildClientReport(input)
    if (!report) return

    reportsSent++
    const body = JSON.stringify(report)

    // sendBeacon survives the page being closed or navigated away from, which
    // is exactly what a user does when something breaks.
    const beacon = typeof navigator !== 'undefined' ? navigator.sendBeacon : undefined
    if (beacon) {
      beacon.call(navigator, CLIENT_ERROR_ENDPOINT, new Blob([body], { type: 'application/json' }))
      return
    }

    void fetch(CLIENT_ERROR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Reporting a failure must never produce another one.
    })
  } catch {
    // Same reason: this function is called from error paths only.
  }
}
