"use client"

import * as React from "react"

import "./globals.css"
import { reportBrowserError } from "@/lib/observability/client-report"

/**
 * Last-resort boundary: this replaces the root layout, so it cannot rely on any
 * provider, font or theme set up there and must render its own document shell.
 * Styling stays inline and self-contained for that reason.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  React.useEffect(() => {
    console.error("[global error boundary]", error)
    if (!error.digest) reportBrowserError({ kind: "boundary", error })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          color: "#fafafa",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "1.5rem",
        }}
      >
        <title>Something went wrong · LingoMatch</title>
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", color: "#a1a1aa", margin: 0 }}>LingoMatch</p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.5rem 0 0" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#a1a1aa", fontSize: "0.875rem", lineHeight: 1.6 }}>
            LingoMatch could not finish loading. Reloading usually fixes it, and your
            account is unaffected.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              marginTop: "1.5rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: "2rem", fontSize: "0.75rem", color: "#71717a" }}>
              Reference: {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  )
}
