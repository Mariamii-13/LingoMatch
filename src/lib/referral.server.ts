import 'server-only'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { reportServerError } from '@/lib/observability/report.server'

export type ReferralResult = { applied: boolean; inviterUsername?: string }

/**
 * Applies an invite-a-partner referral (roadmap #33, §20.3) at registration:
 * records attribution (`invitedBy`) and immediately connects the new account
 * with the inviter as mutual friends — reusing the exact `$addToSet` pattern
 * `/api/friends/[id]/accept` already uses for accepting a request. These two
 * people already agreed to connect by virtue of the invite link existing (a
 * real acquaintance, not a stranger), so there is no separate request/accept
 * step to go through — the whole point is a guaranteed, immediate connection,
 * not another liquidity-dependent queue.
 *
 * Fails soft: an invalid, stale, self-referential, or missing ref code must
 * never fail registration itself — the account being created matters far
 * more than the referral bookkeeping around it.
 */
export async function applyReferral(
  newUserId: string,
  refUsername: string | undefined,
): Promise<ReferralResult> {
  if (!refUsername) return { applied: false }

  try {
    await connectDB()
    const inviter = await User.findOne({ username: refUsername.toLowerCase() })
      .select('_id username')
      .lean<{ _id: unknown; username: string } | null>()
    if (!inviter) return { applied: false }

    const inviterId = String(inviter._id)
    if (inviterId === newUserId) return { applied: false } // cannot refer yourself

    // Every top-level key in a MongoDB update document must either all be
    // plain field paths (a full replacement) or all start with `$` (an
    // atomic update) — never a mix of both. A live test caught this exact
    // mistake: `{ invitedBy: x, $addToSet: {...} }` silently applied the
    // $addToSet and dropped the plain `invitedBy` key entirely, with no
    // thrown error to catch. Fixed by putting both under `$set`/`$addToSet`.
    await Promise.all([
      User.findByIdAndUpdate(newUserId, {
        $set: { invitedBy: inviterId },
        $addToSet: { friends: inviterId },
      }),
      User.findByIdAndUpdate(inviterId, {
        $addToSet: { friends: newUserId },
      }),
    ])

    return { applied: true, inviterUsername: inviter.username }
  } catch (err) {
    reportServerError('referral.applyReferral', err, { context: { refUsername } })
    return { applied: false }
  }
}
