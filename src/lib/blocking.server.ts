import 'server-only'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

type LeanBlockedUsers = { blockedUsers?: mongoose.Types.ObjectId[] } | null

/**
 * True if either user has blocked the other. Blocking is one-directional to
 * set (only the blocker's document changes) but two-directional to enforce —
 * a blocked user must not be able to reach the person who blocked them just
 * because they didn't block back.
 */
export async function isBlockedEitherWay(userIdA: string, userIdB: string): Promise<boolean> {
  await connectDB()
  const doc = await User.findOne({
    $or: [
      { _id: userIdA, blockedUsers: userIdB },
      { _id: userIdB, blockedUsers: userIdA },
    ],
  })
    .select('_id')
    .lean()
  return !!doc
}

/**
 * Every user id that should be excluded from matching/search results for
 * `userId`: who they blocked, plus who blocked them. Two queries rather than
 * one $or because the result shapes differ (my array field vs. other users'
 * documents) and both are index-backed (blockedUsers is indexed).
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  await connectDB()
  const [me, blockedByOthers] = await Promise.all([
    User.findById(userId).select('blockedUsers').lean() as Promise<LeanBlockedUsers>,
    User.find({ blockedUsers: userId }).select('_id').lean() as Promise<
      { _id: mongoose.Types.ObjectId }[]
    >,
  ])

  const mine = (me?.blockedUsers ?? []).map((id) => id.toString())
  const theirs = blockedByOthers.map((u) => u._id.toString())
  return Array.from(new Set([...mine, ...theirs]))
}

/**
 * Blocks stop the two people interacting going forward; they don't rewrite
 * the past. Existing messages and conversation history are left alone —
 * only the friendship link and any pending friend requests are cleared,
 * because staying "friends" with someone you just blocked is incoherent.
 */
export async function blockUser(blockerId: string, targetId: string): Promise<void> {
  await connectDB()
  await Promise.all([
    User.findByIdAndUpdate(blockerId, {
      $addToSet: { blockedUsers: targetId },
      $pull: { friends: targetId, friendRequests: { from: targetId } },
    }),
    User.findByIdAndUpdate(targetId, {
      $pull: { friends: blockerId, friendRequests: { from: blockerId } },
    }),
  ])
}

export async function unblockUser(blockerId: string, targetId: string): Promise<void> {
  await connectDB()
  await User.findByIdAndUpdate(blockerId, { $pull: { blockedUsers: targetId } })
}
