import mongoose, { Schema } from 'mongoose'

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
)

MessageSchema.index({ conversationId: 1, createdAt: 1 })

export default mongoose.models.Message ||
  mongoose.model('Message', MessageSchema)
