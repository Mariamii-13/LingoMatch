// src/hooks/use-unsaved-changes.ts
"use client"

import * as React from "react"

/**
 * Warns before the user abandons unsaved edits.
 *
 * `releaseGuard` exists because a successful save navigates in the same tick it
 * marks the form clean. React has not re-rendered yet, so the `beforeunload`
 * listener is still attached and the browser shows a "leave site?" prompt on a
 * save the user just asked for. Releasing the guard is synchronous, so call it
 * immediately before navigating away from a save.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const releasedRef = React.useRef(false)

  React.useEffect(() => {
    if (!isDirty) return

    releasedRef.current = false

    const handler = (e: BeforeUnloadEvent) => {
      if (releasedRef.current) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  function releaseGuard(): void {
    releasedRef.current = true
  }

  function confirmNavigation(): boolean {
    if (!isDirty || releasedRef.current) return true
    return window.confirm("You have unsaved changes. Leave anyway?")
  }

  return { confirmNavigation, releaseGuard }
}
