import 'server-only'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { reportServerError } from '@/lib/observability/report.server'

/**
 * Number of friend requests waiting on this user.
 *
 * Deliberately separate from GET /api/friends, which populates three full user
 * lists. The navigation only needs a number, and this runs on every signed-in
 * page render, so it projects a single field and counts in memory rather than
 * pulling profile documents for people the user may never look at.
 */
export async function countIncomingFriendRequests(userId: string): Promise<number> {
  try {
    await connectDB()
    const user = await User.findById(userId).select('friendRequests').lean<{
      friendRequests?: unknown[]
    } | null>()
    return user?.friendRequests?.length ?? 0
  } catch (err) {
    // A badge is not worth failing a page render over — but failing quietly on
    // every signed-in render is exactly the kind of fault nobody ever notices,
    // so it is reported even though the page carries on.
    reportServerError('friend-requests count', err)
    return 0
  }
}
