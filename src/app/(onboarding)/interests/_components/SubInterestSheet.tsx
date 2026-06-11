"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface SubInterestSheetProps {
  open: boolean
  category: string
  emoji: string
  subInterests: string[]
  selected: string[]
  onToggle: (interest: string) => void
  onDone: () => void
  onSkip: () => void
}

export function SubInterestSheet({
  open,
  category,
  emoji,
  subInterests,
  selected,
  onToggle,
  onDone,
  onSkip,
}: SubInterestSheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onSkip()
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="rounded-t-2xl max-h-[60vh] px-4 pb-8"
      >
        <div className="w-8 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-4 mt-2" />
        <SheetHeader className="p-0 mb-4">
          <SheetTitle className="text-base font-semibold">
            {emoji} {category} — pick any
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 mb-6 overflow-y-auto max-h-[30vh]">
          {subInterests.map((interest) => (
            <button
              key={interest}
              type="button"
              onClick={() => onToggle(interest)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected.includes(interest)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {interest}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onSkip}>
            Skip detail
          </Button>
          <Button className="flex-1" onClick={onDone}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
