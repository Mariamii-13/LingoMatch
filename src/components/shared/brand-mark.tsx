import Link from "next/link"
import { Mic } from "lucide-react"

import { cn } from "@/lib/utils"

type BrandMarkSize = "sm" | "md" | "lg"

const GLYPH_BOX: Record<BrandMarkSize, string> = {
  sm: "size-8",
  md: "size-8",
  lg: "size-9",
}

const GLYPH: Record<BrandMarkSize, string> = {
  sm: "size-4",
  md: "size-4",
  lg: "size-5",
}

const WORDMARK: Record<BrandMarkSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
}

/**
 * The single definition of the LingoMatch mark.
 *
 * It was previously inlined in six places, and the app sidebar had drifted to a
 * different glyph from the landing page, auth and onboarding headers — so the
 * logo changed as a user moved from signing up into the product. One component
 * means that cannot happen again, and swapping the glyph is now a one-line edit.
 */
export function BrandMark({
  href,
  size = "md",
  hideWordmarkUntilLarge = false,
  className,
}: {
  /** Renders as a link when set; otherwise plain, for use inside another link. */
  href?: string
  size?: BrandMarkSize
  /** Collapsed navigation rails show the glyph alone until there is room. */
  hideWordmarkUntilLarge?: boolean
  className?: string
}) {
  const content = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
          GLYPH_BOX[size],
        )}
      >
        <Mic className={GLYPH[size]} />
      </span>
      <span
        className={cn(
          "font-semibold",
          WORDMARK[size],
          hideWordmarkUntilLarge && "hidden lg:inline",
        )}
      >
        LingoMatch
      </span>
    </>
  )

  if (!href) {
    return <span className={cn("flex items-center gap-2", className)}>{content}</span>
  }

  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 transition-opacity hover:opacity-80", className)}
    >
      {content}
    </Link>
  )
}
