import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"
import { LEARN_PAIRS } from "@/lib/learn-pairs"

/** Only the pages `robots.ts` allows — sitemap and robots must agree. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/learn`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...LEARN_PAIRS.map((pair) => ({
      url: `${SITE_URL}/learn/${pair.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ]
}
