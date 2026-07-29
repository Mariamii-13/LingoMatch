import { z } from 'zod'

/**
 * What the browser is allowed to tell the server about a failure.
 *
 * Everything is bounded, because this endpoint is reachable without signing in:
 * a report is a diagnostic hint, not a channel for arbitrary payloads.
 */
export const clientErrorReportSchema = z.object({
  /** Where the browser caught it. */
  kind: z.enum(['boundary', 'window', 'unhandledrejection']),
  name: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  /** Present when a React error boundary already showed the user a reference. */
  digest: z.string().trim().max(200).optional(),
  /** The page the user was on, not a URL the server should ever request. */
  path: z.string().trim().max(500).optional(),
})

export type ClientErrorReport = z.infer<typeof clientErrorReportSchema>
