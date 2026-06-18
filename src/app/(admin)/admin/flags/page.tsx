"use client"

import { Flag } from "lucide-react"

export default function AdminFlagsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Flag className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Feature Flags</h1>
          <p className="mt-0.5 text-muted-foreground">
            Toggle features on or off without redeploying.
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
        <Flag className="mx-auto mb-4 size-10 text-muted-foreground/40" />
        <p className="font-medium">Feature flags not configured yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect a feature flag provider (LaunchDarkly, Unleash, or custom DB flags) to manage toggles here.
        </p>
      </div>
    </div>
  )
}
