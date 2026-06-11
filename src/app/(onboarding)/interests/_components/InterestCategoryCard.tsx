"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"

interface InterestCategoryCardProps {
  category: string
  emoji: string
  selected: boolean
  subLabels: string[]
  onSelect: () => void
  onOpenSheet: () => void
}

export function InterestCategoryCard({
  category,
  emoji,
  selected,
  subLabels,
  onSelect,
  onOpenSheet,
}: InterestCategoryCardProps) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          "w-full min-h-[120px] rounded-2xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "border-primary bg-primary/10"
            : "border-border bg-background hover:bg-accent"
        )}
      >
        <span className="text-3xl leading-none" role="img" aria-hidden>
          {emoji}
        </span>
        <span
          className={cn(
            "text-sm font-semibold",
            selected ? "text-primary" : "text-foreground"
          )}
        >
          {category}
        </span>
        {selected && subLabels.length > 0 && (
          <span className="text-xs text-primary/70 truncate max-w-full px-1 text-center">
            {subLabels.slice(0, 2).join(", ")}
            {subLabels.length > 2 ? ` +${subLabels.length - 2}` : ""}
          </span>
        )}
      </button>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm pointer-events-none"
              aria-hidden
            >
              <svg
                className="w-3 h-3 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </motion.div>

            <motion.button
              key="plus"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              type="button"
              aria-label={`Add detail for ${category}`}
              onClick={(e) => {
                e.stopPropagation()
                onOpenSheet()
              }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-primary text-primary flex items-center justify-center text-sm font-bold shadow-sm hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              +
            </motion.button>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
