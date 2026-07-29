import 'server-only'
import { unstable_cache } from 'next/cache'
import { connectDB } from '@/lib/db'
import ThemeSettings from '@/lib/models/ThemeSettings'
import { DEFAULT_APP_THEME, type AppTheme } from '@/lib/theme'
import { reportServerError } from '@/lib/observability/report.server'

/** Invalidated by the admin theme route when the palette is saved. */
export const THEME_CACHE_TAG = 'app-theme'

async function readAppTheme(): Promise<AppTheme> {
  try {
    await connectDB()
    const settings = await ThemeSettings.findOne({ siteId: 'default' })
      .select('primaryColor primaryForeground customCss')
      .lean<{
        primaryColor?: string
        primaryForeground?: string
        customCss?: string
      } | null>()

    return {
      primaryColor: settings?.primaryColor ?? DEFAULT_APP_THEME.primaryColor,
      primaryForeground: settings?.primaryForeground ?? DEFAULT_APP_THEME.primaryForeground,
      customCss: settings?.customCss ?? DEFAULT_APP_THEME.customCss,
    }
  } catch (err) {
    // The app is perfectly usable in its default palette; a theme lookup is not
    // worth failing every signed-in page render over. It is still reported,
    // because "the palette silently reverted" is otherwise unexplainable.
    reportServerError('theme read', err)
    return DEFAULT_APP_THEME
  }
}

/**
 * The site palette, read once and reused across requests.
 *
 * This is one row that changes when an administrator edits it and never
 * otherwise, but it is needed on every signed-in page. It used to be fetched by
 * the browser from /api/theme after hydration, which cost a request per page
 * load and made the app paint in the default amber before correcting itself.
 *
 * The time-based window is a backstop for someone editing the collection
 * directly; the tag covers edits made through the admin console.
 */
export const getAppTheme = unstable_cache(readAppTheme, ['app-theme'], {
  tags: [THEME_CACHE_TAG],
  revalidate: 300,
})
