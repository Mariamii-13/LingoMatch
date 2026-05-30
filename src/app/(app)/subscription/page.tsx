"use client"

import * as React from "react"
import { Check, Minus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { pricing } from "@/lib/mock-data"

const comparison: { feature: string; free: boolean | string; premium: boolean | string }[] = [
  { feature: "Daily conversations", free: "3 / day", premium: "Unlimited" },
  { feature: "Conversation modes", free: "2 modes", premium: "All 7 modes" },
  { feature: "AI matching", free: "Basic", premium: "Advanced" },
  { feature: "Priority match queue", free: false, premium: true },
  { feature: "Video calls", free: false, premium: true },
  { feature: "Weekly AI coaching", free: false, premium: true },
  { feature: "Friends", free: "Up to 10", premium: "Unlimited" },
]

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "string") return <span className="text-sm">{value}</span>
  return value ? (
    <Check className="mx-auto size-4 text-primary" />
  ) : (
    <Minus className="mx-auto size-4 text-muted-foreground" />
  )
}

export default function SubscriptionPage() {
  const [yearly, setYearly] = React.useState(false)

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Upgrade your speaking</h1>
        <p className="mt-1 text-muted-foreground">
          Go unlimited and unlock every mode.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border bg-card p-1">
          <button
            onClick={() => setYearly(false)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              !yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              yearly ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Yearly <Badge variant={yearly ? "secondary" : "default"}>-20%</Badge>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        <div className="flex flex-col rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">{pricing.free.name}</h3>
          <div className="mt-4 flex items-end gap-1">
            <span className="text-4xl font-bold">$0</span>
            <span className="mb-1 text-sm text-muted-foreground">/forever</span>
          </div>
          <Button variant="outline" className="mt-6" disabled>
            Current plan
          </Button>
        </div>
        <div className="relative flex flex-col rounded-xl border-2 border-primary bg-card p-6 shadow-lg">
          <Badge className="absolute -top-3 left-6">Recommended</Badge>
          <h3 className="text-lg font-semibold">{pricing.premium.name}</h3>
          <div className="mt-4 flex items-end gap-1">
            <span className="text-4xl font-bold">
              ${yearly ? pricing.premium.yearly : pricing.premium.monthly}
            </span>
            <span className="mb-1 text-sm text-muted-foreground">
              /{yearly ? "year" : "month"}
            </span>
          </div>
          <Button className="mt-6">Upgrade to Premium</Button>
        </div>
      </div>

      {/* Comparison table */}
      <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50 text-sm">
              <th className="px-4 py-3 text-left font-medium">Feature</th>
              <th className="px-4 py-3 text-center font-medium">Free</th>
              <th className="px-4 py-3 text-center font-medium text-primary">Premium</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {comparison.map((row) => (
              <tr key={row.feature} className="text-sm">
                <td className="px-4 py-3">{row.feature}</td>
                <td className="px-4 py-3 text-center"><Cell value={row.free} /></td>
                <td className="px-4 py-3 text-center"><Cell value={row.premium} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
