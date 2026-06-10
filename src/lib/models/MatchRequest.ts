import mongoose, { Schema } from 'mongoose'

const MatchRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['chat', 'video'], required: true },
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
  createdAt: { type: Date, default: Date.now, expires: 900 }, // 15-minute TTL
})

export default mongoose.models.MatchRequest ||
  mongoose.model('MatchRequest', MatchRequestSchema)
