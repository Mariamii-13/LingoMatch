import { reportBrowserError } from './lib/observability/client-report'

/**
 * Runs after the document loads and before React hydrates, which is early
 * enough to catch a failure in hydration itself — the class of bug that leaves
 * a page looking fine and doing nothing.
 *
 * React error boundaries report separately (see src/app/error.tsx); these two
 * listeners cover everything that never reaches a boundary: event handlers,
 * timers, and promise rejections nobody awaited.
 */

window.addEventListener('error', (event) => {
  reportBrowserError({ kind: 'window', error: event.error, message: event.message })
})

window.addEventListener('unhandledrejection', (event) => {
  reportBrowserError({
    kind: 'unhandledrejection',
    error: event.reason,
    message: 'Unhandled promise rejection',
  })
})
