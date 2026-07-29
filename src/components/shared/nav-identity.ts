/**
 * Who the navigation should say you are.
 *
 * Resolved on the server in the (app) layout and passed down. The sidebar and
 * navbar used to read this from useSession, which is empty on first render, so
 * every page briefly announced "User" and "@me" before correcting itself.
 */
export type NavIdentity = {
  name: string
  username: string
  image: string
  role?: string
}

export function navInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
