import 'server-only'
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

type TutorDoc = {
  _id: { toString(): string }
  targetLanguageCode: string
  mode: string
  messages?: { createdAt?: Date }[]
  createdAt: Date
  updatedAt: Date
}

type ConversationDoc = {
  _id: { toString(): string }
  language: string
  startedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Everything the progress page shows, derived from records the app already
 * keeps: persisted tutor sessions and partner conversations. Nothing here is
 * estimated — if a number cannot be counted, it is not displayed.
 */
export async function getProgressSummary(userId: string): Promise<ProgressSummary> {
  await connectDB()

  const [tutorDocs, conversationDocs, partnerMessages] = await Promise.all([
    TutorSession.find({ userId })
      .select('targetLanguageCode mode messages createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean<TutorDoc[]>(),
    Conversation.find({ participants: userId })
      .select('language startedAt createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean<ConversationDoc[]>(),
    Message.countDocuments({ senderId: userId }),
  ])

  const languageCodes = new Set<string>()
  const practiceDays = new Set<string>()
  let tutorMessages = 0
  const recent: RecentPractice[] = []

  for (const doc of tutorDocs) {
    languageCodes.add(doc.targetLanguageCode)
    const messages = doc.messages ?? []
    tutorMessages += messages.length

    // Every turn counts towards the streak, not just when the session started.
    for (const message of messages) {
      if (message.createdAt) practiceDays.add(dayKey(new Date(message.createdAt)))
    }
    practiceDays.add(dayKey(new Date(doc.createdAt)))

    recent.push({
      id: doc._id.toString(),
      kind: 'tutor',
      languageCode: doc.targetLanguageCode,
      mode: doc.mode,
      messageCount: messages.length,
      at: new Date(doc.updatedAt).toISOString(),
    })
  }

  for (const doc of conversationDocs) {
    if (doc.language) languageCodes.add(doc.language.toLowerCase())
    const at = doc.updatedAt ?? doc.startedAt ?? doc.createdAt
    if (at) practiceDays.add(dayKey(new Date(at)))

    recent.push({
      id: doc._id.toString(),
      kind: 'partner',
      languageCode: (doc.language ?? '').toLowerCase(),
      mode: null,
      messageCount: 0,
      at: new Date(at ?? Date.now()).toISOString(),
    })
  }

  recent.sort((a, b) => b.at.localeCompare(a.at))

  return {
    tutorSessions: tutorDocs.length,
    partnerConversations: conversationDocs.length,
    tutorMessages,
    partnerMessages,
    languageCodes: [...languageCodes],
    daysPractised: practiceDays.size,
    currentStreak: computeStreak(practiceDays),
    recent: recent.slice(0, RECENT_LIMIT),
  }
}
