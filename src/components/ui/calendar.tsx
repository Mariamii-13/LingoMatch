"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import type { DayPickerProps, DayButtonProps, ChevronProps } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// Exported for reuse in DobPicker
export function CalendarDayButton({ day: _day, modifiers, className: _cn, ...props }: DayButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])
  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
        modifiers.selected && "bg-purple-600 text-white hover:bg-purple-700 hover:text-white",
        modifiers.today && !modifiers.selected && "bg-accent text-accent-foreground font-semibold",
        modifiers.outside && !modifiers.selected && "text-muted-foreground/40",
        modifiers.disabled && "pointer-events-none opacity-30",
      )}
    />
  )
}

function CalendarChevron({ orientation }: ChevronProps) {
  return orientation === "left" ? (
    <ChevronLeft className="h-4 w-4" />
  ) : (
    <ChevronRight className="h-4 w-4" />
  )
}

export type CalendarProps = DayPickerProps

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <DayPicker
      className={cn("select-none p-3 text-sm", className)}
      classNames={{
        months: "flex flex-col",
        month: "flex flex-col gap-4",
        month_caption: "flex h-8 items-center justify-between px-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous:
          "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        button_next:
          "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        dropdowns: "flex items-center gap-1",
        dropdown:
          "cursor-pointer rounded-md bg-transparent px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-purple-500",
        dropdown_root: "relative",
        month_grid: "w-full border-collapse",
        weekdays: "mt-1 flex",
        weekday: "w-9 text-center text-[0.72rem] font-medium text-muted-foreground",
        weeks: "mt-1",
        week: "flex w-full",
        day: "relative h-9 w-9 p-0 text-center",
        day_button: "",
        outside: "",
        disabled: "",
        hidden: "invisible",
      }}
      components={{
        DayButton: CalendarDayButton,
        Chevron: CalendarChevron,
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"
