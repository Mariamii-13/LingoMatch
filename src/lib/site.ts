/**
 * No custom domain is purchased yet (PROJECT_PASSPORT.md §18.3) — this is the
 * real production URL Vercel already serves (`voxa` project, see 17), kept
 * overridable so a future custom domain is a one-variable change everywhere
 * canonical/OG URLs are built (metadata, sitemap, robots, JSON-LD).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lingomatch-lac.vercel.app"
).replace(/\/$/, "")

export const SITE_NAME = "LingoMatch"
