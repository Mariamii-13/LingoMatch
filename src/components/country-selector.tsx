"use client"

import * as React from "react"
import { ChevronsUpDown, Globe } from "lucide-react"

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
import { countries } from "@/constants/countries"
import { cn } from "@/lib/utils"

export interface CountrySelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  className?: string
}

// Derives 2-letter ISO code from a regional-indicator emoji (e.g. 🇩🇪 → "de")
function flagToISO(flag: string): string {
  return [...flag]
    .map(c => String.fromCharCode((c.codePointAt(0) ?? 0) - 127397))
    .join("")
    .toLowerCase()
}

function CountryFlag({ flag, name }: { flag: string; name: string }) {
  const iso = flagToISO(flag)
  return (
    <img
      src={`https://flagcdn.com/w20/${iso}.png`}
      srcSet={`https://flagcdn.com/w40/${iso}.png 2x`}
      width={20}
      height={15}
      alt={name}
      loading="lazy"
      className="rounded-[2px] object-cover shrink-0"
    />
  )
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <span className="font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  )
}

export function CountrySelector({
  value,
  onChange,
  placeholder = "Select a country",
  allowClear = false,
  disabled = false,
  className,
}: CountrySelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selected = countries.find((c) => c.name === value)

  const filtered = React.useMemo(
    () =>
      countries.filter((c) =>
        c.name.toLowerCase().startsWith(search.toLowerCase())
      ),
    [search]
  )

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) setSearch("")
  }

  function handleSelect(countryName: string) {
    onChange(countryName)
    handleOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={buttonVariants({ variant: "outline", className: cn("w-full justify-between font-normal", className) })}
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <CountryFlag flag={selected.flag} name={selected.name} />
            <span>{selected.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto min-w-[var(--anchor-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search countries…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => handleSelect("")}
                  data-checked={value === "" ? "true" : undefined}
                >
                  <Globe className="size-4 opacity-60" />
                  All Countries
                </CommandItem>
              )}
              {filtered.map((c) => (
                <CommandItem
                  key={c.name}
                  value={c.name}
                  onSelect={() => handleSelect(c.name)}
                  data-checked={value === c.name ? "true" : undefined}
                >
                  <CountryFlag flag={c.flag} name={c.name} />
                  <HighlightMatch text={c.name} query={search} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
