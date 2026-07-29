"use client"

import * as React from "react"
import { Check, Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  type LanguageLevelEntry,
  formatLanguageFull,
  formatLevel,
  getLanguage,
  searchLanguages,
} from "@/constants/languages"
import { FlagImage } from "@/components/shared/flag-image"

export type { LanguageLevelEntry }

interface LanguageLevelPickerProps {
  /** Current selected languages with levels */
  value: LanguageLevelEntry[]
  onChange: (value: LanguageLevelEntry[]) => void
  /** Ordered list of level codes to show in the dropdown (e.g. SPOKEN_LEVELS) */
  levels: readonly string[]
  /** Default level applied when a new language is added */
  defaultLevel: string
  /** Language codes to hide from the picker (e.g. already spoken languages) */
  excludeCodes?: string[]
  placeholder?: string
  className?: string
}

export function LanguageLevelPicker({
  value,
  onChange,
  levels,
  defaultLevel,
  excludeCodes,
  placeholder = "Add a language…",
  className,
}: LanguageLevelPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedCodes = React.useMemo(() => new Set(value.map((v) => v.code)), [value])

  const filtered = React.useMemo(() => {
    const results = searchLanguages(search)
    return results.filter((l) => !excludeCodes?.includes(l.code))
  }, [search, excludeCodes])

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) setSearch("")
  }

  function add(code: string) {
    if (!selectedCodes.has(code)) {
      onChange([...value, { code, level: defaultLevel }])
    }
  }

  function remove(code: string) {
    onChange(value.filter((v) => v.code !== code))
  }

  function setLevel(code: string, level: string) {
    onChange(value.map((v) => (v.code === code ? { ...v, level } : v)))
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected language rows */}
      {value.map(({ code, level }) => {
        const lang = getLanguage(code)
        return (
          <div
            key={code}
            className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
          >
            <span className="shrink-0 text-lg" aria-hidden>
              <FlagImage flag={lang.flag} />
            </span>
            <span className="flex-1 text-sm font-medium">{lang.name}</span>
            {levels.length === 1 ? (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {formatLevel(levels[0])}
              </span>
            ) : levels.length === 2 ? (
              <button
                type="button"
                onClick={() => setLevel(code, level === levels[0] ? levels[1] : levels[0])}
                aria-label={`Toggle native for ${lang.name}`}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  level === levels[0]
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input text-muted-foreground hover:text-foreground"
                )}
              >
                {formatLevel(levels[0])}
              </button>
            ) : (
              <select
                value={level}
                onChange={(e) => setLevel(code, e.target.value)}
                aria-label={`Proficiency level for ${lang.name}`}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                {levels.map((lv) => (
                  <option key={lv} value={lv}>
                    {formatLevel(lv)}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => remove(code)}
              aria-label={`Remove ${lang.name}`}
              className="shrink-0 rounded-full p-0.5 opacity-40 transition-opacity hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}

      {/* Add language button */}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          type="button"
          aria-expanded={open}
          className={buttonVariants({ variant: "outline", size: "sm", className: "h-9 gap-1.5 rounded-full border-dashed px-3 text-muted-foreground hover:text-foreground" })}
        >
          <Plus className="size-3.5" />
          {value.length === 0 ? placeholder : "Add another"}
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" sideOffset={4}>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search languages…"
              value={search}
              onValueChange={setSearch}
              autoFocus
            />
            <CommandList>
              <CommandEmpty>No language found.</CommandEmpty>
              <CommandGroup>
                {filtered.map((lang) => (
                  <CommandItem
                    key={lang.code}
                    value={lang.code}
                    onSelect={() => add(lang.code)}
                  >
                    <span className="shrink-0 text-base" aria-hidden>
                      <FlagImage flag={lang.flag} />
                    </span>
                    <span className="flex-1">{formatLanguageFull(lang)}</span>
                    {selectedCodes.has(lang.code) && (
                      <Check className="ml-2 size-4 shrink-0 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
