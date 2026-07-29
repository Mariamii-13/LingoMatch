"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"

import { StatusScreen } from "@/components/shared/status-screen"
import { reportBrowserError } from "@/lib/observability/client-report"

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  React.useEffect(() => {
    console.error("[error boundary]", error)
    // Only browser-side failures: anything with a digest was already reported
    // server-side by the onRequestError hook.
    if (!error.digest) reportBrowserError({ kind: "boundary", error })
  }, [error])

  return (
    <StatusScreen
      icon={TriangleAlert}
      title="Something went wrong on our side"
      description="This page failed to load. Trying again often fixes it — nothing you saved has been lost."
      actions={[
        { kind: "button", onClick: unstable_retry, label: "Try again" },
        { kind: "link", href: "/dashboard", label: "Go to Home" },
      ]}
      // The digest is how a report gets matched to a server log; the raw
      // message is not shown because it can leak internals.
      detail={error.digest ? `Reference: ${error.digest}` : undefined}
    />
  )
}
