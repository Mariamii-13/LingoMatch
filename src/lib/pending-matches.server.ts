import 'server-only'
import { connectDB } from '@/lib/db'
import MatchAvailability from '@/lib/models/MatchAvailability'
import Conversation from '@/lib/models/Conversation'
import User from '@/lib/models/User'
import { buildMatchPartner, MATCH_PARTNER_SELECT } from '@/lib/match-partner.server'
import { reportServerError } from '@/lib/observability/report.server'
import type { MatchResult } from '@/types'

/**
 * Roadmap #32 (§20.3): a user who declared an availability window and was
 * matched while offline has no way to find out except by coming back. This
 * is that "coming back" surface — server-computed per render, the same
 * pattern the friend-request badge already uses (see 3.10), not a push
 * notification. Reading it marks the rows seen, so a match is only ever
 * surfaced once — same one-shot semantics as `MatchFoundModal` for the live
 * path.
 */
export async function getPendingMatches(userId: string): Promise<MatchResult[]> {
  try {
    await connectDB()

    const rows = await MatchAvailability.find({ userId, status: 'matched', seen: false })
      .sort({ createdAt: -1 })
      .lean<
        {
          _id: unknown
          conversationId: unknown
          targetLanguage: string
        }[]
      >()

    if (rows.length === 0) return []

    await MatchAvailability.updateMany(
      { _id: { $in: rows.map((r) => r._id) } },
      { $set: { seen: true } },
    )

    const results = await Promise.all(
      rows.map(async (row) => {
        // The conversation's own participants are the source of truth for who
        // the partner is; this row only tells us which conversation to look up.
        const conv = await Conversation.findById(row.conversationId).lean<{
          participants: { toString(): string }[]
          compatibilityPct?: number
          type?: 'chat' | 'video' | 'voice'
        } | null>()
        if (!conv) return null

        const partnerId = conv.participants.find((p) => p.toString() !== userId)
        if (!partnerId) return null

        const partnerDoc = await User.findById(partnerId).select(MATCH_PARTNER_SELECT).lean<
          Record<string, unknown>
        >()
        if (!partnerDoc) return null

        // buildMatchPartner's `level` is a formatted display string, not the
        // narrower LanguageLevel union User declares — same shape the chat
        // match route has always returned unchecked via NextResponse.json.
        return {
          conversationId: String(row.conversationId),
          partner: buildMatchPartner(partnerDoc),
          compatibilityPct: conv.compatibilityPct ?? 75,
          // `MatchAvailability.type` is 'chat' | 'voice' (video has no
          // availability path), but the conversation's own real `type` is the
          // source of truth for how the pending-match card should link out.
          type: conv.type ?? 'chat',
        } as MatchResult
      }),
    )

    return results.filter((r): r is MatchResult => r !== null)
  } catch (err) {
    // A failure here must never break the dashboard — worst case the pending
    // match is discovered a page load later than it could have been.
    reportServerError('pendingMatches.getPendingMatches', err, { context: { userId } })
    return []
  }
}
