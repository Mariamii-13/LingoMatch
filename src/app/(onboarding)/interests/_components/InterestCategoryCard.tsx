"use client"
import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface InterestCategoryCardProps {
  category: string
  emoji: string
  selected: boolean
  expanded: boolean
  subInterests: string[]
  selectedSubs: string[]
  onSelect: () => void
  onDeselect: () => void
  onToggleExpand: () => void
  onToggleSub: (interest: string) => void
}

export function InterestCategoryCard({
  category,
  emoji,
  selected,
  expanded,
  subInterests,
  selectedSubs,
  onSelect,
  onDeselect,
  onToggleExpand,
  onToggleSub,
}: InterestCategoryCardProps) {
  return (
    <motion.div
      layout
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border-2 transition-colors duration-150",
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:bg-accent"
      )}
      style={selected ? { gridColumn: "1 / -1" } : undefined}
    >
      {!selected ? (
        <button
          type="button"
          aria-pressed={false}
          onClick={onSelect}
          className="w-full min-h-[110px] p-4 flex flex-col items-center justify-center gap-2 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="text-3xl leading-none" role="img" aria-hidden>
            {emoji}
          </span>
          <span className="text-sm font-semibold text-foreground">{category}</span>
        </button>
      ) : (
        <div className="p-3.5">
          <div className="flex items-center gap-2.5">
            {/* ✓ — only way to deselect a category */}
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              type="button"
              onClick={onDeselect}
              aria-label={`Remove ${category}`}
              className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg
                className="w-3 h-3 text-primary-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.button>

            {/* Header — collapses/expands pills, never deselects */}
            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              aria-label={
                expanded
                  ? `Hide sub-interests for ${category}`
                  : `Show sub-interests for ${category}`
              }
              className="flex-1 flex items-center gap-2 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              <span className="text-xl leading-none flex-shrink-0" role="img" aria-hidden>
                {emoji}
              </span>
              <span className="text-sm font-semibold text-primary flex-1 text-left truncate">
                {category}
              </span>
              {!expanded && selectedSubs.length > 0 && (
                <span className="text-xs text-primary/70 flex-shrink-0 mr-1">
                  {selectedSubs.slice(0, 2).join(", ")}
                  {selectedSubs.length > 2 ? ` +${selectedSubs.length - 2}` : ""}
                </span>
              )}
              <motion.span
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="text-primary/60 flex-shrink-0"
              >
                <ChevronUp className="w-4 h-4" />
              </motion.span>
            </button>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div
                  role="group"
                  aria-label={`Sub-interests for ${category}`}
                  className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-primary/20"
                >
                  {subInterests.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      aria-pressed={selectedSubs.includes(interest)}
                      onClick={() => onToggleSub(interest)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedSubs.includes(interest)
                          ? "border-primary bg-primary/15 text-primary font-semibold"
                          : "border-border bg-background text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
