import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

/**
 * Everything under `(app)`/`(admin)`/`(onboarding)` sits behind the auth gate
 * in `src/proxy.ts` already (§18.3: "correctly invisible to crawlers"), but an
 * explicit disallow keeps a crawler from wasting budget on redirect chains
 * and stops it recording a login redirect as the page's real content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register", "/forgot-password", "/learn"],
      disallow: [
        "/api/",
        "/dashboard",
        "/chat",
        "/messages",
        "/friends",
        "/explore",
        "/profile",
        "/progress",
        "/review",
        "/settings",
        "/ai-practice",
        "/match",
        "/session",
        "/admin",
        "/languages",
        "/interests",
        "/mode",
        "/ai-preferences",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
