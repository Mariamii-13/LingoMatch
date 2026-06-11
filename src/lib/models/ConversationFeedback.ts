import mongoose, { Schema } from 'mongoose'

const ConversationFeedbackSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    wouldTalkAgain: { type: Boolean, required: true },
    note: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
)

// One feedback entry per user per conversation
ConversationFeedbackSchema.index(
  { conversationId: 1, submittedBy: 1 },
  { unique: true }
)

export default mongoose.models.ConversationFeedback ||
  mongoose.model('ConversationFeedback', ConversationFeedbackSchema)
