import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getFriendLists } from "@/lib/friends.server"
import { FriendsClient } from "./FriendsClient"

export const metadata: Metadata = { title: "Friends" }

/*
 * Rendered on the server. This page used to fetch all three lists from the
 * browser behind a full-page spinner, which made it the only page whose own
 * heading was missing from the server HTML.
 *
 * A failed read now falls through to the app shell's error boundary rather than
 * the hand-rolled retry panel this page used to carry.
 */
export default async function FriendsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const lists = (await getFriendLists(session.user.id)) ?? {
    friends: [],
    incoming: [],
    sent: [],
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Friends</h1>
        <p className="mt-1 text-muted-foreground">
          Your language partners and connection requests.
        </p>
      </div>

      <FriendsClient initial={lists} />
    </div>
  )
}
