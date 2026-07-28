"use client"

import * as React from "react"
import { TriangleAlert } from "lucide-react"

import { StatusScreen } from "@/components/shared/status-screen"

/**
 * Errors inside the signed-in app keep the sidebar and navigation, because this
 * boundary renders within the (app) layout. A user whose page broke can still
 * move somewhere else instead of being dropped onto a bare screen.
 */
export default function AppSectionError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  React.useEffect(() => {
    console.error("[app error boundary]", error)
  }, [error])

  return (
    <StatusScreen
      icon={TriangleAlert}
      title="This page could not load"
      description="Something failed while loading this section. Trying again often fixes it, and you can use the navigation to go elsewhere."
      actions={[
        { kind: "button", onClick: unstable_retry, label: "Try again" },
        { kind: "link", href: "/dashboard", label: "Go to Home" },
      ]}
      detail={error.digest ? `Reference: ${error.digest}` : undefined}
    />
  )
}
