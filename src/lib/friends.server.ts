import 'server-only'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { toFriendCard, type FriendLists, type PopulatedFriend } from '@/lib/friends'

const PUBLIC_FIELDS = 'username displayName avatar bio country nativeLanguages learningLanguages'

/**
 * The three lists the friends page shows: confirmed friends, requests waiting on
 * this user, and requests this user has sent.
 *
 * Extracted from GET /api/friends so the page can render on the server instead
 * of the browser fetching it after first paint. The route still exists — the
 * client mutations on that page read it back — so both now share one query and
 * cannot drift apart.
 *
 * Returns null when the user document is gone, which the route reports as 404.
 */
export async function getFriendLists(userId: string): Promise<FriendLists | null> {
  await connectDB()

  const [me, sentTo] = await Promise.all([
    User.findById(userId)
      .select('friends friendRequests')
      .populate('friends', PUBLIC_FIELDS)
      .populate('friendRequests.from', PUBLIC_FIELDS)
      .lean(),
    User.find({ 'friendRequests.from': userId })
      .select(PUBLIC_FIELDS)
      .lean(),
  ])

  if (!me) return null

  const friends = ((me as unknown as { friends: PopulatedFriend[] }).friends ?? []).map(
    toFriendCard,
  )

  const incoming = (
    (me as unknown as { friendRequests: { from: PopulatedFriend }[] }).friendRequests ?? []
  )
    // A request whose sender has since deleted their account populates to null.
    .filter((request) => request.from)
    .map((request) => toFriendCard(request.from))

  const sent = (sentTo as unknown as PopulatedFriend[]).map(toFriendCard)

  return { friends, incoming, sent }
}
