"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"

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
import { formatLanguageFull, getLanguage, searchLanguages } from "@/constants/languages"
import { FlagImage } from "@/components/shared/flag-image"

// ── Types ─────────────────────────────────────────────────────────────────────

interface BaseProps {
  placeholder?: string
  excludeCodes?: string[]  // hides these codes from the picker (e.g. already-native languages)
  className?: string
  disabled?: boolean
}

interface SingleProps extends BaseProps {
  multiple?: false
  value: string
  onChange: (value: string) => void
}

interface MultiProps extends BaseProps {
  multiple: true
  value: string[]
  onChange: (value: string[]) => void
}

type LanguageSelectorProps = SingleProps | MultiProps

// ── Component ─────────────────────────────────────────────────────────────────

export function LanguageSelector(props: LanguageSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    const results = searchLanguages(search)
    if (!props.excludeCodes?.length) return results
    return results.filter((l) => !props.excludeCodes!.includes(l.code))
  }, [search, props.excludeCodes])

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) setSearch("")
  }

  // ── Multi-select ─────────────────────────────────────────────────────────────
  if (props.multiple) {
    const { value, onChange, placeholder = "Add language…", disabled } = props

    function toggle(code: string) {
      onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code])
      // Reset the filter, or the list stays narrowed to the language just picked.
      setSearch("")
    }

    function remove(code: string) {
      onChange(value.filter((c) => c !== code))
    }

    return (
      <div className={cn("flex flex-wrap items-center gap-2", props.className)}>
        {value.map((code) => {
          const lang = getLanguage(code)
          return (
            <span
              key={code}
              className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm text-primary"
            >
              <FlagImage flag={lang.flag} />
              <span>{lang.name}</span>
              <button
                type="button"
                onClick={() => remove(code)}
                disabled={disabled}
                aria-label={`Remove ${lang.name}`}
                className="ml-0.5 rounded-full opacity-60 transition-opacity hover:opacity-100 disabled:pointer-events-none"
              >
                <X className="size-3" />
              </button>
            </span>
          )
        })}

        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger
            type="button"
            disabled={disabled}
            aria-expanded={open}
            className={buttonVariants({ variant: "outline", size: "sm", className: "h-9 gap-1.5 rounded-full border-dashed px-3 text-muted-foreground hover:text-foreground" })}
          >
            <Plus className="size-3.5" />
            {value.length === 0 ? placeholder : "Add more"}
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
                      onSelect={() => toggle(lang.code)}
                    >
                      <FlagImage flag={lang.flag} />
                      <span className="flex-1">{formatLanguageFull(lang)}</span>
                      {value.includes(lang.code) && (
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

  // ── Single-select ─────────────────────────────────────────────────────────────
  const { value, onChange, placeholder = "Select a language…", className, disabled } = props
  const selected = value ? getLanguage(value) : null

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        role="combobox"
        type="button"
        aria-expanded={open}
        disabled={disabled}
        className={buttonVariants({ variant: "outline", className: cn("w-full justify-between font-normal", className) })}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <FlagImage flag={selected.flag} />
            <span>{formatLanguageFull(selected)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
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
                  onSelect={() => {
                    onChange(lang.code)
                    handleOpenChange(false)
                  }}
                  data-checked={value === lang.code ? "true" : undefined}
                >
                  <FlagImage flag={lang.flag} />
                  <span className="flex-1 font-medium">{lang.name}</span>
                  <span className="text-xs text-muted-foreground">{lang.nativeName}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
