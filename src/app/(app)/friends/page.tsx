import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { auth } from "@/auth"
import { getFriendLists } from "@/lib/friends.server"
import { FriendsClient } from "./FriendsClient"
import { InviteCard } from "./InviteCard"

export const metadata: Metadata = { title: "Friends" }

/*
 * Rendered on the server. This page used to fetch all three lists from the
 * browser behind a full-page spinner, which made it the only page whose own
 * heading was missing from the server HTML.
 *
 * A failed read now falls through to the app shell's error boundary rather than
 * the hand-rolled retry panel this page used to carry.
 */

/**
 * The invite link's origin, computed server-side from the real request —
 * not `window.location.origin` client-side — so there is no hydration
 * mismatch and it correctly reflects whatever host the request actually
 * came in on (production domain, or a LAN IP during local testing, see
 * 3.37). Reuses 3.37's own `VERCEL === "1"` check for "is this genuinely
 * served over HTTPS" rather than inventing a second way to ask the same
 * question.
 */
async function getOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get("host") ?? "localhost:3000"
  const protocol = process.env.VERCEL === "1" ? "https" : "http"
  return `${protocol}://${host}`
}

export default async function FriendsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [lists, origin] = await Promise.all([getFriendLists(session.user.id), getOrigin()])
  const friendLists = lists ?? { friends: [], incoming: [], sent: [] }
  const username = (session.user as { username?: string }).username ?? ""

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Friends</h1>
        <p className="mt-1 text-muted-foreground">
          Your language partners and connection requests.
        </p>
      </div>

      <InviteCard inviteLink={`${origin}/register?ref=${username}`} />

      <FriendsClient initial={friendLists} />
    </div>
  )
}
