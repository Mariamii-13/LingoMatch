"use client"

import { useEffect } from "react"

type ThemeVars = {
  primaryColor: string
  primaryForeground: string
  customCss: string
}

export function AppThemeProvider() {
  useEffect(() => {
    fetch("/api/theme")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: ThemeVars | null) => {
        if (!s) return

        document.getElementById("app-theme-vars")?.remove()

        const el = document.createElement("style")
        el.id = "app-theme-vars"
        el.textContent =
          `.app-scope{` +
          `--primary:${s.primaryColor};` +
          `--primary-foreground:${s.primaryForeground};` +
          `--ring:${s.primaryColor};` +
          `--sidebar-primary:${s.primaryColor};` +
          `--sidebar-ring:${s.primaryColor};` +
          `}` +
          (s.customCss ?? "")
        document.head.appendChild(el)
      })
      .catch(() => {})
  }, [])

  return null
}
