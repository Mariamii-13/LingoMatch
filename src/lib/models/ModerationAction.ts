import mongoose, { Schema } from 'mongoose'

// Append-only by convention: no route ever updates or deletes a record here,
// and this collection is deliberately absent from the admin/db CRUD whitelist
// (src/app/api/admin/db/[collection]/route.ts) so it can't be edited that way
// either. An audit trail an admin can rewrite is not an audit trail.
const ModerationActionSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorUsername: { type: String, required: true },
    action: {
      type: String,
      enum: ['ban', 'unban', 'report_reviewed', 'report_resolved', 'report_dismissed'],
      required: true,
    },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUsername: { type: String, required: true },
    reason: { type: String, default: null },
    reportId: { type: Schema.Types.ObjectId, ref: 'Report', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

ModerationActionSchema.index({ createdAt: -1 })
ModerationActionSchema.index({ targetUserId: 1, createdAt: -1 })

export default mongoose.models.ModerationAction ||
  mongoose.model('ModerationAction', ModerationActionSchema)
