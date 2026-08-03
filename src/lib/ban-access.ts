/**
 * A banned user's JWT is re-checked against MongoDB on every request
 * (src/auth.ts), so this only has to decide what to do with a `isBanned`
 * token that's already fresh: block every non-public route. Returns '/login'
 * rather than signing the cookie out directly — the middleware layer can't
 * mutate the session cookie's contents, only redirect, and every subsequent
 * request re-runs this same check, so there is no path back into the app
 * for as long as `isBanned` stays true.
 */
export function getBanRedirect(
  pathname: string,
  isBanned: boolean,
  isPublicPath: boolean
): '/login' | null {
  if (!isBanned || isPublicPath) return null
  return '/login'
}
