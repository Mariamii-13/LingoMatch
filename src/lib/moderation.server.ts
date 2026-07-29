import 'server-only'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import ModerationAction from '@/lib/models/ModerationAction'
import { reportServerError } from '@/lib/observability/report.server'

export type ModerationActionType =
  | 'ban'
  | 'unban'
  | 'report_reviewed'
  | 'report_resolved'
  | 'report_dismissed'

interface RecordModerationActionInput {
  actorId: string
  action: ModerationActionType
  targetUserId: string
  reason?: string | null
  reportId?: string | null
}

/**
 * Writes one row to the moderation audit trail (technical debt 9.20 / 3.20:
 * "no record of who banned whom"). Awaited rather than fired via `after()`
 * like error reporting (src/lib/observability/report.server.ts) — this *is*
 * the record, not a secondary trace of one, so the write must complete
 * before the admin action is considered done.
 *
 * Fails soft: a logging failure must not undo or block a ban that already
 * succeeded. The gap is itself reported through the normal error-observability
 * path so it is still visible in the logs even though the audit row is missing.
 */
export async function recordModerationAction(input: RecordModerationActionInput): Promise<void> {
  try {
    await connectDB()
    const [actor, target] = await Promise.all([
      User.findById(input.actorId).select('username').lean() as Promise<{ username?: string } | null>,
      User.findById(input.targetUserId).select('username').lean() as Promise<{ username?: string } | null>,
    ])

    await ModerationAction.create({
      actorId: input.actorId,
      actorUsername: actor?.username ?? 'unknown',
      action: input.action,
      targetUserId: input.targetUserId,
      targetUsername: target?.username ?? 'unknown',
      reason: input.reason ?? null,
      reportId: input.reportId ?? null,
    })
  } catch (err) {
    reportServerError('moderation.recordModerationAction', err, {
      context: { action: input.action, targetUserId: input.targetUserId },
    })
  }
}
