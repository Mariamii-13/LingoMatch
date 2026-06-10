import mongoose, { Schema } from 'mongoose'

const ConversationSchema = new Schema(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: (v: unknown[]) => v.length === 2,
    },
    type: { type: String, enum: ['chat', 'video'], required: true },
    language: { type: String, required: true },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    livekitRoomName: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null },
    // Ephemeral typing indicator: { userId: lastTypingAt }
    typing: { type: Map, of: Date, default: {} },
  },
  { timestamps: true }
)

ConversationSchema.index({ participants: 1, status: 1 })

export default mongoose.models.Conversation ||
  mongoose.model('Conversation', ConversationSchema)
