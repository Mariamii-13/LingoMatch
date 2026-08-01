import 'server-only'
import { connectDB } from '@/lib/db'
import SkillReview from '@/lib/models/SkillReview'
import { reportServerError } from '@/lib/observability/report.server'
import { formatSkillTag } from '@/lib/skill-tag-format'

/**
 * Leitner-style fixed review intervals (roadmap #31, PROJECT_PASSPORT.md
 * 20.8 Phase 1): grow on a remembered review, reset to the shortest interval
 * on a forgotten one. Deliberately not a fitted per-user forgetting curve
 * (Duolingo's published Half-Life Regression) — there is no review history
 * yet to fit one from; upgrading to that is Phase 2, gated on real data.
 */
const LEITNER_INTERVALS_DAYS = [1, 3, 7, 21] as const
const DAY_MS = 24 * 60 * 60 * 1000

/** Pure: the next review interval after an outcome. Exported for direct testing. */
export function nextIntervalDays(currentIntervalDays: number, remembered: boolean): number {
  if (!remembered) return LEITNER_INTERVALS_DAYS[0]
  const currentIndex = LEITNER_INTERVALS_DAYS.indexOf(
    currentIntervalDays as (typeof LEITNER_INTERVALS_DAYS)[number],
  )
  const nextIndex =
    currentIndex === -1 ? 1 : Math.min(currentIndex + 1, LEITNER_INTERVALS_DAYS.length - 1)
  return LEITNER_INTERVALS_DAYS[nextIndex]
}

/**
 * Records that the tutor gave a real correction for this skill — population,
 * not testing. Creates a new schedule (due tomorrow) the first time this
 * skill is seen for this user/language; on a recurrence, only refreshes the
 * example shown, since only an actual review outcome should move the review
 * clock. Fails soft: a missed write must never break the tutor reply that
 * triggered it (the same reasoning as `recordModerationAction` and the
 * friend-badge count) — reported through the normal observability path
 * rather than thrown, since this call is fire-and-forget from the route.
 */
export async function recordCorrection(args: {
  userId: string
  targetLanguageCode: string
  skillTag: string
  exampleCorrection: string
}): Promise<void> {
  try {
    await connectDB()
    const existing = await SkillReview.findOne({
      userId: args.userId,
      targetLanguageCode: args.targetLanguageCode,
      skillTag: args.skillTag,
    })
    if (existing) {
      existing.exampleCorrection = args.exampleCorrection
      await existing.save()
      return
    }
    await SkillReview.create({
      userId: args.userId,
      targetLanguageCode: args.targetLanguageCode,
      skillTag: args.skillTag,
      exampleCorrection: args.exampleCorrection,
      intervalDays: LEITNER_INTERVALS_DAYS[0],
      dueAt: new Date(Date.now() + LEITNER_INTERVALS_DAYS[0] * DAY_MS),
    })
  } catch (err) {
    reportServerError('skill-review.recordCorrection', err, {
      context: { targetLanguageCode: args.targetLanguageCode, skillTag: args.skillTag },
    })
  }
}

export type DueReview = {
  id: string
  skillTag: string
  targetLanguageCode: string
  exampleCorrection: string
  dueAt: Date
}

/** The review deck's own query: everything due for this user right now. */
export async function getDueReviews(userId: string, limit = 20): Promise<DueReview[]> {
  await connectDB()
  const docs = await SkillReview.find({ userId, dueAt: { $lte: new Date() } })
    .sort({ dueAt: 1 })
    .limit(limit)
    .lean<
      {
        _id: unknown
        skillTag: string
        targetLanguageCode: string
        exampleCorrection: string
        dueAt: Date
      }[]
    >()

  return docs.map((doc) => ({
    id: String(doc._id),
    skillTag: doc.skillTag,
    targetLanguageCode: doc.targetLanguageCode,
    exampleCorrection: doc.exampleCorrection,
    dueAt: doc.dueAt,
  }))
}

/** Fails soft to 0 — a badge count is not worth failing a page render over (matches 3.10's friend badge). */
export async function countDueReviews(userId: string): Promise<number> {
  try {
    await connectDB()
    return await SkillReview.countDocuments({ userId, dueAt: { $lte: new Date() } })
  } catch (err) {
    reportServerError('skill-review.countDueReviews', err, { context: { userId } })
    return 0
  }
}

/**
 * §20.8 item 5 — the piece that makes the tutor feel like "a real teacher,
 * not a chatbot": a short, factual, plain-language summary of skills this
 * learner has been reviewed on and is still struggling with, for injection
 * into the tutor's own system prompt at the start of a session (never
 * mid-session — see 19.2 on prompt length driving drift, and this data
 * doesn't change turn-to-turn).
 *
 * "Struggling" is defined narrowly and honestly from what this schedule
 * actually tracks: `reviewCount >= 1` (reviewed and reset/tested at least
 * once, not just corrected once in passing) and still on a short interval
 * (<=3 days) — i.e. the learner has been given a chance to retain this and
 * the schedule hasn't yet trusted them with it. A brand-new correction with
 * no review history is not "struggling", it's just seen once; nothing is
 * reported until there's a real signal, so this never fabricates a weakness.
 */
export async function getWeakSkillsSummary(
  userId: string,
  targetLanguageCode: string,
  limit = 3,
): Promise<string[]> {
  // Fails soft to an empty list: this is on the critical path of starting a
  // tutor session (awaited before the reply is generated), so a failure here
  // must degrade to "no weak-areas line" rather than blocking the session —
  // the same reasoning as `countDueReviews`'s badge count.
  try {
    await connectDB()
    const docs = await SkillReview.find({
      userId,
      targetLanguageCode,
      reviewCount: { $gte: 1 },
      intervalDays: { $lte: 3 },
    })
      .sort({ reviewCount: -1, updatedAt: -1 })
      .limit(limit)
      .lean<{ skillTag: string }[]>()

    return docs.map((doc) => formatSkillTag(doc.skillTag))
  } catch (err) {
    reportServerError('skill-review.getWeakSkillsSummary', err, {
      context: { targetLanguageCode },
    })
    return []
  }
}

/**
 * Records a review outcome and reschedules per the Leitner progression.
 * Ownership-scoped in the query itself (`loadOwnedTutorSession`'s pattern):
 * filtering on `userId` alongside `_id` means one user cannot mark, and so
 * cannot reschedule, another user's review. Returns false (not an error) for
 * a missing/foreign id, matching `blockUser`-style boolean-return handling.
 */
export async function recordReviewOutcome(args: {
  userId: string
  reviewId: string
  remembered: boolean
}): Promise<boolean> {
  await connectDB()
  const doc = await SkillReview.findOne({ _id: args.reviewId, userId: args.userId })
  if (!doc) return false

  const newInterval = nextIntervalDays(doc.intervalDays, args.remembered)
  doc.intervalDays = newInterval
  doc.dueAt = new Date(Date.now() + newInterval * DAY_MS)
  doc.lastReviewedAt = new Date()
  doc.reviewCount = (doc.reviewCount ?? 0) + 1
  await doc.save()
  return true
}
