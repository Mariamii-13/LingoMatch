"use client"

import * as React from "react"
import { toast } from "sonner"
import { Paintbrush } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ThemeSettings = {
  primaryColor: string
  primaryForeground: string
  defaultMode: "light" | "dark" | "system"
  fontFamily: string
  borderRadius: "none" | "sm" | "md" | "lg" | "full"
  customCss: string
}

const DEFAULT: ThemeSettings = {
  primaryColor: "#f59e0b",
  primaryForeground: "#09090b",
  defaultMode: "system",
  fontFamily: "inter",
  borderRadius: "md",
  customCss: "",
}

export default function AdminThemePage() {
  const [settings, setSettings] = React.useState<ThemeSettings>(DEFAULT)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/admin/theme")
      .then((r) => r.json())
      .then((data) => {
        setSettings({
          primaryColor: data.primaryColor ?? DEFAULT.primaryColor,
          primaryForeground: data.primaryForeground ?? DEFAULT.primaryForeground,
          defaultMode: data.defaultMode ?? DEFAULT.defaultMode,
          fontFamily: data.fontFamily ?? DEFAULT.fontFamily,
          borderRadius: data.borderRadius ?? DEFAULT.borderRadius,
          customCss: data.customCss ?? DEFAULT.customCss,
        })
      })
      .catch(() => toast.error("Failed to load theme settings"))
      .finally(() => setLoading(false))
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/admin/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to save")
        return
      }
      toast.success("Theme settings saved")
    } catch {
      toast.error("Failed to save theme settings")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Theme Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Customize the visual appearance of the application.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Colors */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Colors</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, primaryColor: e.target.value }))
                  }
                  className="h-9 w-12 cursor-pointer rounded border border-input p-0.5"
                />
                <Input
                  value={settings.primaryColor}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, primaryColor: e.target.value }))
                  }
                  placeholder="#f59e0b"
                  className="h-9 font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Primary Foreground</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primaryForeground}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, primaryForeground: e.target.value }))
                  }
                  className="h-9 w-12 cursor-pointer rounded border border-input p-0.5"
                />
                <Input
                  value={settings.primaryForeground}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, primaryForeground: e.target.value }))
                  }
                  placeholder="#09090b"
                  className="h-9 font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Typography & Layout */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Typography & Layout</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Default Mode</label>
              <select
                value={settings.defaultMode}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    defaultMode: e.target.value as ThemeSettings["defaultMode"],
                  }))
                }
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Font Family</label>
              <select
                value={settings.fontFamily}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, fontFamily: e.target.value }))
                }
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                <option value="inter">Inter</option>
                <option value="geist">Geist</option>
                <option value="roboto">Roboto</option>
                <option value="poppins">Poppins</option>
                <option value="system">System UI</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Border Radius</label>
              <select
                value={settings.borderRadius}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    borderRadius: e.target.value as ThemeSettings["borderRadius"],
                  }))
                }
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                <option value="none">None</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="full">Full</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom CSS */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-1 font-semibold">Custom CSS</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Override CSS variables or inject additional styles site-wide.
          </p>
          <textarea
            value={settings.customCss}
            onChange={(e) =>
              setSettings((s) => ({ ...s, customCss: e.target.value }))
            }
            placeholder=":root { --primary: 38 92% 50%; }"
            rows={8}
            className="w-full rounded-lg border border-input bg-transparent p-3 font-mono text-sm outline-none focus-visible:border-ring dark:bg-input/30"
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2">
            <Paintbrush className="size-4" />
            {saving ? "Saving…" : "Save Theme"}
          </Button>
        </div>
      </form>
    </div>
  )
}
