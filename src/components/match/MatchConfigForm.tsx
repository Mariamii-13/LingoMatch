"use client"

import { cn } from "@/lib/utils"
import { languageOptions } from "@/lib/mock-data"
import { CountrySelector } from "@/components/country-selector"

const INTERESTS = ["Anime", "Travel", "Gaming", "Music", "Food", "Books", "Movies", "Fitness"]

interface MatchConfigFormProps {
  targetLanguage: string
  nativeLanguage: string
  interests: string[]
  countryPreference?: string
  onTargetLanguage: (lang: string) => void
  onNativeLanguage: (lang: string) => void
  onInterests: (interests: string[]) => void
  onCountryPreference?: (country: string) => void
}

export function MatchConfigForm({
  targetLanguage,
  nativeLanguage,
  interests,
  countryPreference = '',
  onTargetLanguage,
  onNativeLanguage,
  onInterests,
  onCountryPreference = () => {},
}: MatchConfigFormProps) {
  const toggleInterest = (i: string) =>
    onInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i])

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          I want to practice
        </p>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => onTargetLanguage(l.code)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                targetLanguage === l.code
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <span>{l.flag}</span> {l.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          My native language
        </p>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => onNativeLanguage(l.code)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                nativeLanguage === l.code
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <span>{l.flag}</span> {l.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Partner country (optional)
        </p>
        <CountrySelector
          value={countryPreference}
          onChange={onCountryPreference}
          placeholder="Any country"
          allowClear
          className="h-9 sm:w-64"
        />
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Shared interests (optional)
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleInterest(i)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                interests.includes(i)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
