import mongoose, { Schema } from 'mongoose'

/**
 * Roadmap #32 (§20.3): standing "I'm free around this time" rows, distinct
 * from `MatchRequest`'s ephemeral live-queue rows. A fresh collection so its
 * TTL index (`expiresAt`, variable per document) never conflicts with
 * `MatchRequest`'s existing fixed 900s TTL on `createdAt` — changing that
 * index's `expireAfterSeconds` in place would need a manual `collMod` on the
 * live database, which is a production migration this feature doesn't need.
 *
 * Matching happens synchronously whenever either side's request is written
 * (see `tryMatch` in the chat match route): no cron job scans this
 * collection, it is only ever read at another request's insert time.
 */
const MatchAvailabilitySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['chat'], required: true, default: 'chat' },
  targetLanguage: { type: String, required: true },
  nativeLanguage: { type: String, required: true },
  interests: { type: [String], default: [] },
  countryPreference: { type: String, default: '' },
  status: {
    type: String,
    enum: ['open', 'matched', 'cancelled'],
    default: 'open',
  },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
  // Set true once the match has been surfaced to the user who wasn't live
  // when it formed (dashboard pending-match card). Unrelated to `status`:
  // a request can be matched and unseen, or matched and seen.
  seen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  // expireAfterSeconds: 0 means "expire at the exact Date stored here" —
  // createdAt + the availability window the user chose.
  expiresAt: { type: Date, required: true, expires: 0 },
})

MatchAvailabilitySchema.index({ type: 1, status: 1, targetLanguage: 1, nativeLanguage: 1 })
MatchAvailabilitySchema.index({ userId: 1, status: 1, seen: 1 })

export default mongoose.models.MatchAvailability ||
  mongoose.model('MatchAvailability', MatchAvailabilitySchema)
