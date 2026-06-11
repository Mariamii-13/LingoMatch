import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import Conversation from '@/lib/models/Conversation'
import Message from '@/lib/models/Message'
import Report from '@/lib/models/Report'
import ConversationFeedback from '@/lib/models/ConversationFeedback'
import User from '@/lib/models/User'

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRole = (session.user as { role?: string }).role
  if (userRole !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000)

  const [
    totalConversations,
    activeConversations,
    todayConversations,
    weekConversations,
    durationAgg,
    totalMessages,
    openReports,
    totalFeedback,
    feedbackAgg,
    totalUsers,
    activeUsersToday,
  ] = await Promise.all([
    Conversation.countDocuments(),
    Conversation.countDocuments({ status: 'active' }),
    Conversation.countDocuments({ startedAt: { $gte: startOfToday } }),
    Conversation.countDocuments({ startedAt: { $gte: sevenDaysAgo } }),
    Conversation.aggregate([
      { $match: { status: 'ended', durationSeconds: { $ne: null, $gt: 0 } } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$durationSeconds' },
          total: { $sum: '$durationSeconds' },
        },
      },
    ]),
    Message.countDocuments(),
    Report.countDocuments({ status: 'open' }),
    ConversationFeedback.countDocuments(),
    ConversationFeedback.aggregate([
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          wouldTalkAgainCount: {
            $sum: { $cond: ['$wouldTalkAgain', 1, 0] },
          },
        },
      },
    ]),
    User.countDocuments(),
    User.countDocuments({ lastSeenAt: { $gte: startOfToday } }),
  ])

  const avgDurationSeconds = durationAgg[0]?.avg ?? 0
  const avgRating = feedbackAgg[0]?.avgRating ?? 0
  const wouldTalkAgainCount = feedbackAgg[0]?.wouldTalkAgainCount ?? 0

  return NextResponse.json({
    conversations: {
      total: totalConversations,
      active: activeConversations,
      today: todayConversations,
      thisWeek: weekConversations,
      avgDurationSeconds: Math.round(avgDurationSeconds),
      avgDurationMinutes: Math.round(avgDurationSeconds / 60),
    },
    messages: {
      total: totalMessages,
      avgPerConversation:
        totalConversations > 0
          ? Math.round(totalMessages / totalConversations)
          : 0,
    },
    moderation: {
      openReports,
    },
    feedback: {
      total: totalFeedback,
      avgRating: Math.round(avgRating * 10) / 10,
      wouldTalkAgainRate:
        totalFeedback > 0
          ? Math.round((wouldTalkAgainCount / totalFeedback) * 100)
          : 0,
    },
    users: {
      total: totalUsers,
      activeToday: activeUsersToday,
    },
  })
}
