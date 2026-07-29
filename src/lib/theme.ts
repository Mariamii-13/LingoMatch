export type AppTheme = {
  primaryColor: string
  primaryForeground: string
  customCss: string
}

export const DEFAULT_APP_THEME: AppTheme = {
  primaryColor: '#f59e0b',
  primaryForeground: '#09090b',
  customCss: '',
}

/**
 * Admin-authored CSS, made safe to inline in a server-rendered <style>.
 *
 * The browser ends a style element at the first `</` sequence regardless of what
 * follows, so custom CSS containing one could close the tag early and inject
 * markup. This used to be impossible by construction — the CSS was applied with
 * `element.textContent`, which cannot break out — and rendering it on the server
 * gives that guarantee up unless the sequence is removed.
 */
export function sanitiseCustomCss(css: string): string {
  return css.replace(/<\//g, '')
}

/** The `.app-scope` variable overrides, plus any admin custom CSS. */
export function themeStyleSheet(theme: AppTheme): string {
  return (
    `.app-scope{` +
    `--primary:${theme.primaryColor};` +
    `--primary-foreground:${theme.primaryForeground};` +
    `--ring:${theme.primaryColor};` +
    `--sidebar-primary:${theme.primaryColor};` +
    `--sidebar-ring:${theme.primaryColor};` +
    `}` +
    sanitiseCustomCss(theme.customCss ?? '')
  )
}
