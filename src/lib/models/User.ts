import mongoose, { Schema } from 'mongoose'

const LearningLanguageSchema = new Schema(
  {
    code: { type: String, required: true },
    level: { type: String, required: true },
  },
  { _id: false }
)

const InterestsSchema = new Schema(
  {
    anime: { type: [String], default: [] },
    books: { type: [String], default: [] },
    movies: { type: [String], default: [] },
    music: { type: [String], default: [] },
    gaming: { type: [String], default: [] },
    travel: { type: [String], default: [] },
    food: { type: [String], default: [] },
    hobbies: { type: [String], default: [] },
  },
  { _id: false }
)

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: { type: String, required: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null },
    avatar: { type: String, default: '' },
    voiceIntro: { type: String, default: '' },
    country: { type: String, default: '' },
    timezone: { type: String, default: '' },
    nativeLanguages: { type: [String], default: [] },
    learningLanguages: { type: [LearningLanguageSchema], default: [] },
    interests: {
      type: InterestsSchema,
      default: () => ({}),
    },
    conversationModes: { type: [String], default: [] },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    planExpiry: { type: Date, default: null },
    stripeCustomerId: { type: String, default: null },
    dailySessionCount: { type: Number, default: 0 },
    lastSessionDate: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    onboardingCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.models.User || mongoose.model('User', UserSchema)
