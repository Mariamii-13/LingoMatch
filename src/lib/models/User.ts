import mongoose, { Schema } from 'mongoose'

const AIProfileSchema = new Schema(
  {
    conversationGoals: { type: [String], default: [] },
    matchingPriority: { type: String, default: '' },
    socialEnergy: { type: Number, default: 5 },
    comfortLevel: { type: Number, default: 6 },
    socialAnxietyLevel: { type: Number, default: 4 },
    pace: { type: String, enum: ['Slow', 'Medium', 'Fast'], default: 'Medium' },
    style: { type: String, enum: ['Formal', 'Casual'], default: 'Casual' },
    preferredTraits: { type: [String], default: [] },
    personalityNotes: { type: String, default: '' },
    topicsToAvoid: { type: [String], default: [] },
    aiConversationStarters: { type: Boolean, default: true },
  },
  { _id: false }
)

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
    bio: { type: String, default: '' },
    voiceIntro: { type: String, default: '' },
    country: { type: String, default: '' },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    age: { type: Number, default: null },
    timezone: { type: String, default: '' },
    // Legacy — kept for backward compat; new writes use spokenLanguages
    nativeLanguages: { type: [String], default: [] },
    // Structured spoken languages with CEFR / Native levels
    spokenLanguages: { type: [LearningLanguageSchema], default: [] },
    learningLanguages: { type: [LearningLanguageSchema], default: [] },
    interests: {
      type: InterestsSchema,
      default: () => ({}),
    },
    conversationModes: { type: [String], default: [] },
    aiProfile: {
      type: AIProfileSchema,
      default: () => ({}),
    },
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
    lastSeenAt: { type: Date, default: null },
    friends: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    friendRequests: {
      type: [
        {
          from: { type: Schema.Types.ObjectId, ref: 'User' },
          createdAt: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
)

// username and email have unique:true which creates B-tree indexes;
// prefix-regex queries (^pattern) on those fields are index-backed.
// friendRequests.from index supports the sent-requests reverse lookup.
UserSchema.index({ 'friendRequests.from': 1 })

export default mongoose.models.User || mongoose.model('User', UserSchema)
