import mongoose, { Schema } from 'mongoose'

/**
 * One row per (user, target language, skill tag) — a spaced-repetition
 * review schedule built automatically from the tutor's own real corrections
 * (roadmap #31, PROJECT_PASSPORT.md 20.2/20.8). Leitner-style fixed
 * intervals, not a fitted regression: there is no review history yet to fit
 * a per-user forgetting curve from, and 18.6 says use the smallest proven
 * mechanism the evidence supports, not the most sophisticated one available.
 */
const SkillReviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetLanguageCode: { type: String, required: true },
    skillTag: { type: String, required: true },
    /** A real correction the tutor gave, so the review can show what was actually wrong. */
    exampleCorrection: { type: String, required: true },
    intervalDays: { type: Number, default: 1 },
    dueAt: { type: Date, required: true },
    lastReviewedAt: { type: Date, default: null },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

// One schedule per user/language/skill — upserted on each real correction.
SkillReviewSchema.index({ userId: 1, targetLanguageCode: 1, skillTag: 1 }, { unique: true })
// "What's due for this user right now" — the review deck's own query.
SkillReviewSchema.index({ userId: 1, dueAt: 1 })

export default mongoose.models.SkillReview || mongoose.model('SkillReview', SkillReviewSchema)
