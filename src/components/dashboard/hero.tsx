"use client"

import { useState } from "react"
import Link from "next/link"
import { Flame, Mic } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { dashboardStats } from "@/lib/mock-data"

const CHIPS = [
  { flag: "🇰🇷", label: "Korean",     count: 134 },
  { flag: "🇯🇵", label: "Japanese",   count: 91  },
  { flag: "🇧🇷", label: "Portuguese", count: 76  },
  { flag: "🇫🇷", label: "French",     count: 58  },
  { flag: "🇩🇪", label: "German",     count: 43  },
  { flag: "🇲🇽", label: "Spanish",    count: 288 },
]

const STAT_PILLS = [
  { flag: "🇰🇷", value: "134", label: "Korea online",  cyan: true  },
  { flag: "🇯🇵", value: "91",  label: "Japan online",  cyan: true  },
  { flag: "🇺🇸", value: "288", label: "USA online",    cyan: false },
  { flag: null,  value: "31",  label: "Your friends",  cyan: false },
  { flag: "🔥",  value: "12",  label: "Your streak",   cyan: false },
]

export function DashboardHero({ firstName }: { firstName: string }) {
  const [selected, setSelected] = useState<string | null>(null)

  const matchHref = selected
    ? `/match?lang=${encodeURIComponent(selected)}`
    : "/match"

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-background via-background to-primary/5 p-6 sm:p-8">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-cyan-500/5 blur-2xl" />

      {/* Greeting + streak */}
      <div className="relative mb-3 flex items-center gap-2.5">
        <span className="text-sm text-muted-foreground">
          Good morning, {firstName}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/20 bg-orange-500/8 px-2.5 py-0.5 text-xs font-medium text-orange-400">
          <Flame className="size-3" />
          {dashboardStats.streak} day streak
        </span>
      </div>

      {/* Live indicator — Option B */}
      <div className="relative mb-4 flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-cyan-400" />
        </span>
        <span className="text-xs font-medium text-cyan-400">
          247 conversations happening right now · 40+ countries
        </span>
      </div>

      {/* Headline — Option C */}
      <h1 className="relative mb-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
        Meet the world{" "}
        <span className="block bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
          through conversation.
        </span>
      </h1>

      <p className="relative mb-5 text-sm text-muted-foreground sm:text-base">
        Practice any language with real people, right now.
      </p>

      {/* Stat pills row — Option B: global + personal merged */}
      <div className="relative mb-6 flex flex-wrap gap-2">
        {STAT_PILLS.map((s) => (
          <div
            key={s.label}
            className={[
              "rounded-lg border px-3 py-1.5 text-center",
              s.cyan
                ? "border-cyan-500/15 bg-cyan-500/5"
                : "border-border/50 bg-card/40",
            ].join(" ")}
          >
            <p className={`text-sm font-bold leading-none ${s.cyan ? "text-cyan-400" : "text-foreground"}`}>
              {s.flag ? `${s.flag} ${s.value}` : s.value}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CTA — high contrast white, not neon */}
      <div className="relative mb-6">
        <Button
          size="lg"
          className="h-12 gap-2 bg-foreground px-7 text-base font-semibold text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          nativeButton={false}
          render={<Link href={matchHref} />}
        >
          <Mic className="size-4" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={selected ?? "default"}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.12 }}
            >
              {selected ? `Start ${selected} Match` : "Start Voice Match"}
            </motion.span>
          </AnimatePresence>
        </Button>
      </div>

      {/* Language chips — Option A style, C palette */}
      <div className="relative flex flex-wrap gap-2">
        {CHIPS.map((chip) => {
          const active = selected === chip.label
          return (
            <motion.button
              key={chip.label}
              onClick={() => setSelected(active ? null : chip.label)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/15 text-primary-foreground"
                  : "border-primary/20 bg-primary/5 text-violet-300 hover:border-primary/40 hover:bg-primary/10",
              ].join(" ")}
            >
              <span className="text-sm">{chip.flag}</span>
              <span>{chip.label}</span>
              <span className="opacity-40">{chip.count}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
