import { cn } from "@/lib/utils"

/** Derives a 2-letter ISO code from a regional-indicator emoji (🇩🇪 → "de"). */
function flagToISO(flag: string): string {
  return [...flag]
    .map((char) => String.fromCharCode((char.codePointAt(0) ?? 0) - 127397))
    .join("")
    .toLowerCase()
}

/**
 * Renders a flag as an image rather than an emoji.
 *
 * Windows ships no country glyphs in Segoe UI Emoji, so 🇬🇧 falls back to the
 * bare regional-indicator letters and a language badge read "GB English"
 * instead of showing a flag. The country selector already solved this by
 * mapping the emoji to a flag CDN; this is that approach extracted so language
 * badges get it too.
 *
 * Decorative by default: the adjacent label always names the language or
 * country, so an empty alt keeps screen readers from reading it twice.
 */
export function FlagImage({
  flag,
  label,
  className,
}: {
  flag: string
  /** Set only when no adjacent text names the same thing. */
  label?: string
  className?: string
}) {
  const iso = flagToISO(flag)
  if (!/^[a-z]{2}$/.test(iso)) return null

  return (
    // 20px flags from a CDN; next/image would add a per-image optimisation
    // cost for no benefit at this size.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w20/${iso}.png`}
      srcSet={`https://flagcdn.com/w40/${iso}.png 2x`}
      width={20}
      height={15}
      alt={label ?? ""}
      loading="lazy"
      className={cn("inline-block shrink-0 rounded-[2px] object-cover", className)}
    />
  )
}
