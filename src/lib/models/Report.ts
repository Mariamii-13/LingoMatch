import mongoose, { Schema } from 'mongoose'

export const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Inappropriate Content',
  'Fake Profile',
  'Other',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

const ReportSchema = new Schema(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, default: '', maxlength: 1000 },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'resolved', 'dismissed'],
      default: 'open',
    },
  },
  { timestamps: true }
)

ReportSchema.index({ reportedUser: 1, status: 1 })
ReportSchema.index({ reportedBy: 1, createdAt: -1 })
ReportSchema.index({ status: 1, createdAt: -1 }) // admin list queries

export default mongoose.models.Report || mongoose.model('Report', ReportSchema)
