"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { CalendarDayButton } from "@/components/ui/calendar"

type View = "day" | "month" | "year"

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// Suppresses DayPicker's built-in caption/nav — we render our own header
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Noop = (_: any): React.JSX.Element => <></>

interface DobPickerProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  startMonth?: Date
  endMonth?: Date
  defaultMonth?: Date
  disabled?: ((date: Date) => boolean)
}

export function DobPicker({
  selected,
  onSelect,
  startMonth,
  endMonth,
  defaultMonth,
  disabled,
}: DobPickerProps) {
  const [view, setView] = React.useState<View>("day")
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    () => defaultMonth ?? endMonth ?? new Date()
  )

  const minYear = startMonth?.getFullYear() ?? new Date().getFullYear() - 100
  const maxYear = endMonth?.getFullYear() ?? new Date().getFullYear()

  // Descending list: newest year first so scrolling to current year is quick
  const years = React.useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i),
    [minYear, maxYear]
  )

  // Auto-scroll the active year into view when year panel opens
  const yearListRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (view !== "year" || !yearListRef.current) return
    const active = yearListRef.current.querySelector<HTMLElement>("[data-active='true']")
    active?.scrollIntoView({ block: "center", behavior: "instant" })
  }, [view])

  // Month boundary helpers
  const monthFloor = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
  const startFloor = startMonth ? monthFloor(startMonth) : null
  const endFloor = endMonth ? monthFloor(endMonth) : null

  const canGoPrev = !startFloor || monthFloor(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1)) >= startFloor
  const canGoNext = !endFloor || monthFloor(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1)) <= endFloor

  function navigate(delta: number) {
    setDisplayMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
      if (startFloor && next < startFloor) return prev
      if (endFloor && next > endFloor) return prev
      return next
    })
  }

  function selectMonth(monthIndex: number) {
    setDisplayMonth((prev) => {
      let next = new Date(prev.getFullYear(), monthIndex, 1)
      if (startFloor && next < startFloor) next = new Date(startFloor)
      if (endFloor && next > endFloor) next = new Date(endFloor)
      return next
    })
    setView("day")
  }

  function selectYear(year: number) {
    setDisplayMonth((prev) => {
      let next = new Date(year, prev.getMonth(), 1)
      if (startFloor && next < startFloor) next = new Date(year, startFloor.getMonth(), 1)
      if (endFloor && next > endFloor) next = new Date(year, endFloor.getMonth(), 1)
      return next
    })
    setView("day")
  }

  const navBtnClass = cn(
    "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground",
    "transition-colors hover:bg-accent hover:text-accent-foreground",
    "disabled:pointer-events-none disabled:opacity-30"
  )

  const headerBtnClass = (active: boolean) =>
    cn(
      "rounded-md px-2 py-1 text-sm font-semibold transition-colors",
      active
        ? "bg-purple-600 text-white"
        : "hover:bg-accent hover:text-accent-foreground"
    )

  return (
    <div className="w-[272px] select-none p-3 text-sm">
      {/* ── Header ── */}
      <div className="flex h-8 items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          disabled={!canGoPrev || view !== "day"}
          className={navBtnClass}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setView((v) => (v === "month" ? "day" : "month"))}
            className={headerBtnClass(view === "month")}
          >
            {MONTHS_FULL[displayMonth.getMonth()]}
          </button>
          <button
            type="button"
            onClick={() => setView((v) => (v === "year" ? "day" : "year"))}
            className={headerBtnClass(view === "year")}
          >
            {displayMonth.getFullYear()}
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(1)}
          disabled={!canGoNext || view !== "day"}
          className={navBtnClass}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Day grid ── */}
      {view === "day" && (
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(date) => onSelect?.(date)}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          disabled={disabled}
          classNames={{
            months: "",
            month: "flex flex-col",
            month_caption: "",
            nav: "",
            month_grid: "w-full border-collapse",
            weekdays: "mt-3 flex",
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
            MonthCaption: Noop,
            Nav: Noop,
            DayButton: CalendarDayButton,
          }}
        />
      )}

      {/* ── Month grid ── */}
      {view === "month" && (
        <div className="mt-3 grid grid-cols-3 gap-1">
          {MONTHS_SHORT.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => selectMonth(i)}
              className={cn(
                "rounded-md py-2 text-sm font-medium transition-colors",
                displayMonth.getMonth() === i
                  ? "bg-purple-600 text-white"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Year list ── */}
      {view === "year" && (
        <div
          ref={yearListRef}
          className={cn(
            "mt-3 h-52 overflow-y-auto rounded-md",
            "[&::-webkit-scrollbar]:w-1",
            "[&::-webkit-scrollbar-track]:bg-transparent",
            "[&::-webkit-scrollbar-thumb]:rounded-full",
            "[&::-webkit-scrollbar-thumb]:bg-border"
          )}
        >
          <div className="flex flex-col gap-0.5">
            {years.map((y) => (
              <button
                key={y}
                type="button"
                data-active={displayMonth.getFullYear() === y ? "true" : undefined}
                onClick={() => selectYear(y)}
                className={cn(
                  "w-full rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors",
                  displayMonth.getFullYear() === y
                    ? "bg-purple-600 text-white"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
