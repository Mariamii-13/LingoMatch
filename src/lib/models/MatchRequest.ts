import mongoose, { Schema } from 'mongoose'

const MatchRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['chat', 'video', 'voice'], required: true },
  targetLanguage: { type: String, required: true },
  nativeLanguage: { type: String, required: true },
  interests: { type: [String], default: [] },
  countryPreference: { type: String, default: '' },
  status: {
    type: String,
    enum: ['waiting', 'matched', 'cancelled'],
    default: 'waiting',
  },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
  // Updated on every poll — requests silent for >12s are treated as ghosts
  lastPolledAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now, expires: 900 }, // 15-minute TTL
})

MatchRequestSchema.index({ type: 1, status: 1, lastPolledAt: 1 })

export default mongoose.models.MatchRequest ||
  mongoose.model('MatchRequest', MatchRequestSchema)
