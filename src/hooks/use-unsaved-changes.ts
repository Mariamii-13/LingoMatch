// src/hooks/use-unsaved-changes.ts
"use client"

import * as React from "react"

export function useUnsavedChanges(isDirty: boolean) {
  React.useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  function confirmNavigation(): boolean {
    if (!isDirty) return true
    return window.confirm("You have unsaved changes. Leave anyway?")
  }

  return { confirmNavigation }
}
