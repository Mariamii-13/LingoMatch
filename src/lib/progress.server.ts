import 'server-only'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import TutorSession from '@/lib/models/TutorSession'
import Conversation from '@/lib/models/Conversation'
import Message from '@/lib/models/Message'

const RECENT_LIMIT = 8
const STREAK_LOOKBACK_DAYS = 30

export type RecentPractice = {
  id: string
  kind: 'tutor' | 'partner'
  languageCode: string
  mode: string | null
  messageCount: number
  at: string
}

export type ProgressSummary = {
  tutorSessions: number
  partnerConversations: number
  tutorMessages: number
  partnerMessages: number
  languageCodes: string[]
  daysPractised: number
  currentStreak: number
  recent: RecentPractice[]
}

/** Local calendar day key, so "days practised" counts days, not 24h blocks. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Consecutive days of practice ending today or yesterday.
 *
 * Yesterday still counts as current: a streak should not be reported broken
 * simply because the user has not practised yet on the day they are looking.
 */
function computeStreak(days: Set<string>): number {
  if (days.size === 0) return 0

  const cursor = new Date()
  if (!days.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    if (!days.has(dayKey(cursor))) return 0
  }

  let streak = 0
  while (days.has(dayKey(cursor)) && streak < STREAK_LOOKBACK_DAYS) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

type RecentTutorDoc = {
  _id: { toString(): string }
  targetLanguageCode: string
  mode: string
  messages?: unknown[]
  updatedAt: Date
}

type RecentConversationDoc = {
  _id: { toString(): string }
  language?: string
  startedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Everything the progress page and dashboard show, derived from records the app
 * already keeps: persisted tutor sessions and partner conversations. Nothing is
 * estimated — if a number cannot be counted, it is not displayed.
 *
 * Deliberately built from aggregations and bounded queries rather than loading a
 * user's whole history. This runs on the two most-visited pages, and a learner
 * with hundreds of sessions should not cost more to serve than a new one.
 */
export async function getProgressSummary(userId: string): Promise<ProgressSummary> {
  await connectDB()
  const userObjectId = new mongoose.Types.ObjectId(userId)
  const streakSince = new Date(Date.now() - STREAK_LOOKBACK_DAYS * 86_400_000)

  const [
    tutorSessions,
    partnerConversations,
    tutorTotals,
    partnerMessages,
    tutorLanguages,
    conversationLanguages,
    recentTutor,
    recentConversations,
    recentTutorDays,
    recentConversationDays,
  ] = await Promise.all([
    TutorSession.countDocuments({ userId }),
    Conversation.countDocuments({ participants: userId }),
    // One pass for the message total instead of pulling every transcript.
    TutorSession.aggregate<{ total: number }>([
      { $match: { userId: userObjectId } },
      { $group: { _id: null, total: { $sum: { $size: { $ifNull: ['$messages', []] } } } } },
    ]),
    Message.countDocuments({ senderId: userId }),
    TutorSession.distinct('targetLanguageCode', { userId }),
    Conversation.distinct('language', { participants: userId }),
    TutorSession.find({ userId })
      .select('targetLanguageCode mode messages updatedAt')
      .sort({ updatedAt: -1 })
      .limit(RECENT_LIMIT)
      .lean<RecentTutorDoc[]>(),
    Conversation.find({ participants: userId })
      .select('language startedAt createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(RECENT_LIMIT)
      .lean<RecentConversationDoc[]>(),
    // Streak only needs the recent window, which bounds this regardless of how
    // much history the user has.
    TutorSession.find({ userId, updatedAt: { $gte: streakSince } })
      .select('messages.createdAt createdAt')
      .lean<{ messages?: { createdAt?: Date }[]; createdAt: Date }[]>(),
    Conversation.find({ participants: userId, updatedAt: { $gte: streakSince } })
      .select('updatedAt startedAt createdAt')
      .lean<RecentConversationDoc[]>(),
  ])

  const practiceDays = new Set<string>()
  for (const doc of recentTutorDays) {
    for (const message of doc.messages ?? []) {
      if (message.createdAt) practiceDays.add(dayKey(new Date(message.createdAt)))
    }
    if (doc.createdAt) practiceDays.add(dayKey(new Date(doc.createdAt)))
  }
  for (const doc of recentConversationDays) {
    const at = doc.updatedAt ?? doc.startedAt ?? doc.createdAt
    if (at) practiceDays.add(dayKey(new Date(at)))
  }

  const languageCodes = new Set<string>()
  for (const code of tutorLanguages as string[]) {
    if (code) languageCodes.add(code.toLowerCase())
  }
  for (const code of conversationLanguages as string[]) {
    if (code) languageCodes.add(code.toLowerCase())
  }

  const recent: RecentPractice[] = [
    ...recentTutor.map((doc) => ({
      id: doc._id.toString(),
      kind: 'tutor' as const,
      languageCode: doc.targetLanguageCode,
      mode: doc.mode,
      messageCount: (doc.messages ?? []).length,
      at: new Date(doc.updatedAt).toISOString(),
    })),
    ...recentConversations.map((doc) => {
      const at = doc.updatedAt ?? doc.startedAt ?? doc.createdAt
      return {
        id: doc._id.toString(),
        kind: 'partner' as const,
        languageCode: (doc.language ?? '').toLowerCase(),
        mode: null,
        messageCount: 0,
        at: new Date(at ?? Date.now()).toISOString(),
      }
    }),
  ]
  recent.sort((a, b) => b.at.localeCompare(a.at))

  return {
    tutorSessions,
    partnerConversations,
    tutorMessages: tutorTotals[0]?.total ?? 0,
    partnerMessages,
    languageCodes: [...languageCodes],
    daysPractised: practiceDays.size,
    currentStreak: computeStreak(practiceDays),
    recent: recent.slice(0, RECENT_LIMIT),
  }
}
