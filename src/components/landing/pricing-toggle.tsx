"use client"

import * as React from "react"
import Link from "next/link"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { pricing } from "@/lib/mock-data"

export function PricingToggle() {
  const [yearly, setYearly] = React.useState(false)

  return (
    <div className="flex flex-col items-center">
      <div className="mb-10 inline-flex items-center gap-3 rounded-full border bg-card p-1">
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
          Yearly
          <Badge variant={yearly ? "secondary" : "default"}>-20%</Badge>
        </button>
      </div>

      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold">{pricing.free.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you need to start speaking.
          </p>
          <div className="mt-6 flex items-end gap-1">
            <span className="text-4xl font-bold">$0</span>
            <span className="mb-1 text-sm text-muted-foreground">/forever</span>
          </div>
          <Button variant="outline" className="mt-6" nativeButton={false} render={<Link href="/register" />}>
            Get Started
          </Button>
          <ul className="mt-6 space-y-3 text-sm">
            {pricing.free.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Premium */}
        <div className="relative flex flex-col rounded-xl border-2 border-primary bg-card p-6 shadow-lg">
          <Badge className="absolute -top-3 left-6">Most Popular</Badge>
          <h3 className="text-lg font-semibold">{pricing.premium.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            For serious learners who want it all.
          </p>
          <div className="mt-6 flex items-end gap-1">
            <span className="text-4xl font-bold">
              ${yearly ? pricing.premium.yearly : pricing.premium.monthly}
            </span>
            <span className="mb-1 text-sm text-muted-foreground">
              /{yearly ? "year" : "month"}
            </span>
          </div>
          <Button className="mt-6" nativeButton={false} render={<Link href="/register" />}>
            Start Free Trial
          </Button>
          <ul className="mt-6 space-y-3 text-sm">
            {pricing.premium.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
