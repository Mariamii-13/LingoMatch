"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Check, Mic } from "lucide-react"

import { cn } from "@/lib/utils"

const steps = [
  { href: "/profile", label: "Profile" },
  { href: "/ai-preferences", label: "AI Preferences" },
  { href: "/languages", label: "Languages" },
  { href: "/interests", label: "Interests" },
  { href: "/mode", label: "Modes" },
]

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const currentIndex = steps.findIndex((s) => pathname.startsWith(s.href))
  const activeIndex = currentIndex === -1 ? 0 : currentIndex

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mic className="size-4" />
            </span>
            <span className="font-semibold">LingoMatch</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            Step {activeIndex + 1} of {steps.length}
          </span>
        </div>

        {/* Step indicator */}
        <div className="mx-auto max-w-2xl px-4 pb-4 sm:px-6">
          <div className="flex items-center">
            {steps.map((step, i) => {
              const done = i < activeIndex
              const active = i === activeIndex
              return (
                <div key={step.href} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                        done && "border-primary bg-primary text-primary-foreground",
                        active && "border-primary text-primary",
                        !done && !active && "border-border text-muted-foreground"
                      )}
                    >
                      {done ? <Check className="size-4" /> : i + 1}
                    </div>
                    <span
                      className={cn(
                        "hidden text-[11px] sm:block",
                        active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "mx-1 h-0.5 flex-1 rounded-full transition-colors sm:mx-2",
                        i < activeIndex ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
