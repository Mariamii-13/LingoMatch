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
import { FlagImage } from "@/components/shared/flag-image"

export interface CountrySelectorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  className?: string
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
            <FlagImage flag={selected.flag} />
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
                  <FlagImage flag={c.flag} />
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
