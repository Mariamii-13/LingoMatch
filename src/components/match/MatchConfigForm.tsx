"use client"

import { cn } from "@/lib/utils"
import { LanguageSelector } from "@/components/language-selector"
import { CountrySelector } from "@/components/country-selector"

const INTERESTS = ["Anime", "Travel", "Gaming", "Music", "Food", "Books", "Movies", "Fitness"]

// Roadmap #32: how far ahead the user is willing to be matched, not just
// right now. Values are minutes; 0 means "right now" (today's instant queue).
const AVAILABILITY_OPTIONS: { minutes: 0 | 60 | 360 | 1440; label: string }[] = [
  { minutes: 0, label: "Right now" },
  { minutes: 60, label: "Within the hour" },
  { minutes: 360, label: "Later today" },
  { minutes: 1440, label: "Anytime in the next day" },
]

interface MatchConfigFormProps {
  targetLanguage: string
  nativeLanguage: string
  interests: string[]
  countryPreference?: string
  onTargetLanguage: (lang: string) => void
  onNativeLanguage: (lang: string) => void
  onInterests: (interests: string[]) => void
  onCountryPreference?: (country: string) => void
  /** Omit to hide the availability selector entirely (e.g. video match, which needs both sides live). */
  availabilityMinutes?: number
  onAvailabilityMinutes?: (minutes: number) => void
}

export function MatchConfigForm({
  targetLanguage,
  nativeLanguage,
  interests,
  countryPreference = "",
  onTargetLanguage,
  onNativeLanguage,
  onInterests,
  onCountryPreference = () => {},
  availabilityMinutes,
  onAvailabilityMinutes,
}: MatchConfigFormProps) {
  const toggleInterest = (i: string) =>
    onInterests(interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i])

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          I want to practice
        </p>
        <LanguageSelector
          value={targetLanguage}
          onChange={onTargetLanguage}
          placeholder="Select a language"
          className="sm:w-64"
        />
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          My native language
        </p>
        <LanguageSelector
          value={nativeLanguage}
          onChange={onNativeLanguage}
          placeholder="Select a language"
          className="sm:w-64"
        />
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

      {onAvailabilityMinutes && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            When are you free?
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => onAvailabilityMinutes(opt.minutes)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  availabilityMinutes === opt.minutes
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {availabilityMinutes !== 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              No live partner right now? We&apos;ll keep looking and show your match here or on
              your dashboard as soon as one turns up.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
