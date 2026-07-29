import 'server-only'
import { connectDB } from '@/lib/db'
import TutorSession from '@/lib/models/TutorSession'
import type { HistoryMessage } from '@/lib/ai/openrouter'

/**
 * How many stored messages are replayed to the model.
 *
 * The full transcript is kept for the learner, but only the tail is sent
 * upstream: prompt size drives cost, and a tutor does not need the start of a
 * long session to answer the next turn.
 */
export const PROVIDER_HISTORY_LIMIT = 20

/**
 * Upper bound on a single session's length. Reaching it means starting a fresh
 * session rather than growing one document without limit.
 */
export const MAX_SESSION_MESSAGES = 200

export type StoredMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type TutorSessionView = {
  id: string
  targetLanguageCode: string
  mode: string
  messages: StoredMessage[]
}

type TutorSessionDoc = {
  _id: { toString(): string }
  targetLanguageCode: string
  mode: string
  messages?: StoredMessage[]
}

function toView(doc: TutorSessionDoc): TutorSessionView {
  return {
    id: doc._id.toString(),
    targetLanguageCode: doc.targetLanguageCode,
    mode: doc.mode,
    messages: (doc.messages ?? []).map(({ role, content }) => ({ role, content })),
  }
}

/** The session a returning learner should be dropped back into, if any. */
export async function getActiveTutorSession(
  userId: string,
): Promise<TutorSessionView | null> {
  await connectDB()
  const doc = await TutorSession.findOne({
    userId,
    status: 'active',
    // A session is created before its first reply streams, so one that never
    // produced a message is an abandoned shell, not something to resume.
    'messages.0': { $exists: true },
  })
    .sort({ updatedAt: -1 })
    .lean<TutorSessionDoc | null>()
  return doc ? toView(doc) : null
}

/**
 * Starts a new session, ending any other active one first so a user always has
 * at most one session to resume and cannot accumulate stale transcripts.
 *
 * Created empty: the opening reply streams to the client, so its text is only
 * known once the stream finishes.
 */
export async function startTutorSession(args: {
  userId: string
  targetLanguageCode: string
  mode: string
}): Promise<TutorSessionView> {
  await connectDB()
  await endActiveTutorSessions(args.userId)

  const doc = await TutorSession.create({
    userId: args.userId,
    targetLanguageCode: args.targetLanguageCode,
    mode: args.mode,
    status: 'active',
    messages: [],
  })

  return toView(doc as unknown as TutorSessionDoc)
}

/** Records the tutor's opening message once its stream completes. */
export async function appendAssistantMessage(args: {
  sessionId: string
  userId: string
  content: string
}): Promise<void> {
  await connectDB()
  await TutorSession.updateOne(
    { _id: args.sessionId, userId: args.userId, status: 'active' },
    { $push: { messages: { role: 'assistant', content: args.content, createdAt: new Date() } } },
  )
}

export async function endActiveTutorSessions(userId: string): Promise<void> {
  await connectDB()
  await TutorSession.updateMany(
    { userId, status: 'active' },
    { $set: { status: 'ended', endedAt: new Date() } },
  )
}

export type LoadedSession = {
  view: TutorSessionView
  /** The tail of the transcript, ready to replay to the model. */
  providerHistory: HistoryMessage[]
  atMessageLimit: boolean
}

/** Loads a session the caller owns. Returns null when it is missing or theirs. */
export async function loadOwnedTutorSession(
  userId: string,
  sessionId: string,
): Promise<LoadedSession | null> {
  await connectDB()
  const doc = await TutorSession.findOne({
    _id: sessionId,
    userId,
    status: 'active',
  }).lean<TutorSessionDoc | null>()
  if (!doc) return null

  const view = toView(doc)
  return {
    view,
    providerHistory: view.messages.slice(-PROVIDER_HISTORY_LIMIT),
    atMessageLimit: view.messages.length >= MAX_SESSION_MESSAGES,
  }
}

/** Appends the learner's turn and the tutor's reply as one atomic update. */
export async function appendTutorExchange(args: {
  sessionId: string
  userId: string
  userMessage: string
  assistantReply: string
}): Promise<void> {
  await connectDB()
  await TutorSession.updateOne(
    { _id: args.sessionId, userId: args.userId, status: 'active' },
    {
      $push: {
        messages: {
          $each: [
            { role: 'user', content: args.userMessage, createdAt: new Date() },
            { role: 'assistant', content: args.assistantReply, createdAt: new Date() },
          ],
        },
      },
    },
  )
}
