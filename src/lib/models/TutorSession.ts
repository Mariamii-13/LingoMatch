import mongoose, { Schema } from 'mongoose'

/**
 * A single AI tutor conversation.
 *
 * Sessions are persisted so a reload, a dropped connection or a switch to
 * another device does not throw away the learner's practice. The server also
 * becomes the source of truth for history: it no longer has to trust whatever
 * transcript the client claims happened.
 */
const TutorMessageSchema = new Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const TutorSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetLanguageCode: { type: String, required: true },
    mode: { type: String, required: true },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    messages: { type: [TutorMessageSchema], default: [] },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

// Resuming looks up "this user's active session, most recently updated first".
TutorSessionSchema.index({ userId: 1, status: 1, updatedAt: -1 })

export default mongoose.models.TutorSession ||
  mongoose.model('TutorSession', TutorSessionSchema)
