# SpeakFirst — Complete Startup Blueprint

> Voice-first global language learning social platform

---

## 1. PRODUCT STRATEGY

**Vision:** The world's most human-centered language learning platform — where real conversations replace flashcards.

**Mission:** Connect people across languages and cultures through voice-first interactions powered by emotional intelligence.

**Positioning:** "Duolingo teaches words. SpeakFirst teaches conversation."

**Core Value Props:**
- Real humans, real accents, real conversations
- AI that understands YOUR comfort level — privately
- Voice-first, not text-first
- Low pressure, emotionally safe environment
- Community-driven roadmap

**Business Model:** Freemium SaaS — subscription tiers

---

## 2. USER PERSONAS

### Persona 1 — Shy Learner (Primary)
- Age: 18–25
- Learning English / Spanish / Japanese
- Anxious about speaking with strangers
- Uses Duolingo but craves real practice
- Pain: No safe space to practice speaking
- Goal: Gain confidence, become conversational

### Persona 2 — Confident Connector
- Age: 22–35
- Already conversational, wants fluency
- Loves cultural exchange
- Pain: Traditional apps feel boring and transactional
- Goal: Deep friendships, cultural immersion

### Persona 3 — Remote Professional
- Age: 28–40
- Needs business-level language skills
- Has budget, limited time
- Pain: Classes are expensive and inflexible
- Goal: Professional fluency, global networking

### Persona 4 — Culture Enthusiast
- Age: 20–30
- Into anime, K-pop, travel, gaming
- Wants to connect with native speakers
- Pain: Hard to find people sharing same niche interests
- Goal: Authentic connections around shared culture

---

## 3. USER JOURNEYS

### New User
```
Landing → Sign Up → Welcome → Public Profile Setup →
AI Preferences (private) → Language Selection →
Interest Selection → Mode Selection →
AI Match Queue → Voice Session → Post-Session →
Retention Loop (friend/schedule/rematch)
```

### Returning User
```
Login → Dashboard → Quick Match OR Scheduled Session →
Voice Session → Friend Feed
```

### Premium Upgrade
```
Hit free session limit → Soft paywall →
Value proposition → Plan select →
Stripe checkout → Unlock → Retention
```

---

## 4. INFORMATION ARCHITECTURE

```
/ ................................ Landing page
/auth
  /login
  /register
  /verify-email
  /forgot-password
  /reset-password
/onboarding
  /profile ...................... Step 1 — public profile
  /ai-preferences ............... Step 2 — private AI prefs
  /languages .................... Step 3 — language selection
  /interests .................... Step 4 — interest tags
  /mode ......................... Step 5 — conversation mode
/dashboard ...................... Main hub
/match .......................... AI matching queue
/session/[id] ................... Live voice session
/friends ........................ Friend list + requests
/schedule ....................... Scheduled sessions
/profile/[username] ............. Public profile view
/settings
  /account
  /privacy
  /ai-preferences
  /notifications
  /subscription
/community
  /feedback
  /ideas
  /vote
/admin .......................... Owner only
  /dashboard
  /users
  /sessions
  /reports
  /feedback
  /analytics
  /ai-config
  /feature-flags
```

---

## 5. COMPLETE FEATURE BREAKDOWN

### Authentication
- Google OAuth
- Email + password
- Email verification
- Password reset
- Secure session management (JWT, httpOnly cookies)

### Onboarding (5-step wizard)
- Progress indicator
- Skip + revisit later options
- Framer Motion step transitions
- Profile photo upload
- Voice intro recording (15–30s)

### Public Profile
- Display name + username
- Country flag + timezone
- Language badges (native / learning + level)
- Interest tags: anime, books, movies, music, gaming, travel, food, hobbies
- Optional profile photo
- Optional voice introduction
- Session count, friend count, member since

### Private AI Preferences (encrypted, AI-only — never visible to other users)
- Preferred partner personality
- Comfort level (1–10 slider)
- Social anxiety level (1–10 slider)
- Conversation goals (multi-select)
- Topics to avoid (free text + tags)
- Preferred conversation pace
- Optional: age range, gender preference
- Communication style (formal / casual)
- Learning goals

### Conversation Modes
- Friendly
- Casual Practice
- Deep Conversations
- Cultural Exchange
- Study Together
- Fast Speaking Practice
- Flirty Vibes (optional, opt-in only)

### AI Matching System
- Language pair compatibility
- Timezone-aware pairing
- Interest Jaccard similarity
- AI personality compatibility scoring (GPT-4o)
- Private comfort preference alignment
- Queue with wait time estimation
- Threshold relaxation after 60s/120s
- Skip / pass mechanism

### Voice Session
- WebRTC peer-to-peer voice (DTLS-SRTP encrypted)
- Mute / unmute
- Speaking indicator (AnalyserNode waveform)
- Optional video — both users must explicitly agree
- Session timer
- Floating emoji reactions
- AI conversation prompts panel
- Translation toggle
- AI coaching sidebar (collapsible)
- Post-session pronunciation feedback
- Grammar + vocabulary notes

### Post-Session Flow
- Add Friend
- Practice Again (instant rematch)
- Schedule Future Session
- Pass / Not Interested
- Report user
- Private conversation rating (feeds AI improvement)

### Friend System
- Friend request / accept / decline
- Friend list with online indicators
- Direct text message (basic)
- Schedule session with friend
- Friend activity feed on dashboard

### Scheduling
- Calendar picker with timezone display
- Session reminders (email + in-app)
- Recurring session option (premium)

### AI Features
- Match scoring engine
- Conversation prompt generation
- Real-time translation hints
- Post-session grammar analysis
- Pronunciation scoring (Whisper)
- Vocabulary suggestions
- Comfort optimization
- Post-session insights report
- Learning progress tracking
- Weekly AI email report

### Community Feedback
- Idea submission
- Feature request
- Bug report
- Improvement suggestion
- Public vote on ideas
- Status updates (planned / in progress / done / declined)
- AI trend + sentiment analysis (founder-facing)

### Subscription & Payments
- Free vs Premium comparison display
- Stripe checkout (all 4 billing periods)
- Stripe billing portal
- Session limit enforcement
- Premium feature gates
- Contextual upgrade prompts
- Email on payment events

### Notifications
- Match found
- Friend request
- Scheduled session reminder (24h + 10min)
- Feature vote status update
- Premium expiry warning
- New AI insights available

### Moderation
- In-session report button
- Post-session report form
- Auto-flag: 3 reports in 7 days → suspend pending review
- Admin review queue
- Warn / temp ban / permanent ban
- Block user (client-side)
- Appeals via email

### Admin Dashboard
- Overview: DAU, sessions today, revenue, open reports
- User management: search, filter, details, ban
- Session monitor: active count, flagged review
- Reports queue: pending → reviewed → actioned
- Feedback management: view all, update status
- Feature flags: toggle features on/off
- AI configuration: edit prompt templates
- Analytics: retention, engagement, conversion charts

### Founder Dashboard (AI-powered)
- Feedback trend charts (over time)
- Sentiment analysis breakdown
- Top requested features (ranked)
- User pain point map
- Retention risk signals
- AI-suggested roadmap
- Cohort retention (W1 / W2 / W4)
- Revenue metrics: MRR, ARR, plan split, churn

---

## 6. MVP DEFINITION

**Ship these — nothing else:**
- Auth (Google + Email)
- Onboarding wizard (profile + AI prefs)
- Voice session (WebRTC)
- Basic AI matching (language + interests + AI scoring)
- Post-session flow (friend / pass / report)
- Basic friend system
- Free + Premium plans (Stripe)
- Dark / Light mode
- Mobile responsive

**NOT in MVP:**
- Video sessions
- Scheduling
- Community feedback module
- Pronunciation analysis
- Founder AI dashboard
- Session recordings
- Group conversations

---

## 7. FUTURE ROADMAP

| Phase | Features |
|-------|----------|
| MVP (v1.0) | Voice + matching + auth + payments |
| v1.5 | Video, scheduling, community feedback, PWA |
| v2.0 | AI coaching, pronunciation analysis, founder dashboard |
| v2.5 | Mobile apps (React Native), language clubs, group sessions |
| v3.0 | B2B (schools/companies), API, white-label |
| v4.0 | AI avatar practice partner, VR/AR sessions |

---

## 8. DATABASE SCHEMA (Mongoose)

### User
```js
{
  _id: ObjectId,
  email: { type: String, unique: true, required: true },
  username: { type: String, unique: true, required: true },
  displayName: String,
  passwordHash: String,
  googleId: String,
  avatar: String,           // URL
  voiceIntro: String,       // URL
  country: String,
  timezone: String,
  nativeLanguages: [String],
  learningLanguages: [{
    code: String,           // 'es', 'ja', etc.
    level: String           // beginner / intermediate / advanced
  }],
  interests: {
    anime: [String],
    books: [String],
    movies: [String],
    music: [String],
    gaming: [String],
    travel: [String],
    food: [String],
    hobbies: [String]
  },
  conversationModes: [String],
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  planExpiry: Date,
  stripeCustomerId: String,
  dailySessionCount: { type: Number, default: 0 },
  lastSessionDate: Date,
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  banReason: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: Date,
  updatedAt: Date
}
```

### AIPreferences (AES-256 encrypted at application layer)
```js
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', unique: true },
  personalityPreference: String,      // encrypted
  comfortLevel: Number,               // 1–10
  socialAnxietyLevel: Number,         // 1–10
  conversationGoals: [String],        // encrypted
  topicsToAvoid: [String],            // encrypted
  conversationPace: String,           // slow / medium / fast
  ageRangeMin: Number,
  ageRangeMax: Number,
  genderPreference: String,
  communicationStyle: String,         // formal / casual
  learningGoals: [String],
  updatedAt: Date
}
```

### Session
```js
{
  _id: ObjectId,
  participants: [{ type: ObjectId, ref: 'User' }],
  mode: String,
  languagePair: { from: String, to: String },
  status: { type: String, enum: ['waiting', 'active', 'ended'] },
  startedAt: Date,
  endedAt: Date,
  duration: Number,         // seconds
  videoEnabled: { type: Boolean, default: false },
  aiPrompts: [String],
  matchScore: Number,
  recordingUrls: [String],  // premium + both consent
  createdAt: Date
}
```

### SessionOutcome
```js
{
  _id: ObjectId,
  sessionId: { type: ObjectId, ref: 'Session' },
  userId: { type: ObjectId, ref: 'User' },
  partnerUserId: { type: ObjectId, ref: 'User' },
  action: { type: String, enum: ['add_friend', 'practice_again', 'schedule', 'pass'] },
  rating: Number,           // 1–5, private, feeds AI
  notes: String,            // private
  createdAt: Date
}
```

### Friendship
```js
{
  _id: ObjectId,
  requester: { type: ObjectId, ref: 'User' },
  recipient: { type: ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'accepted', 'blocked'] },
  createdAt: Date,
  updatedAt: Date
}
```

### ScheduledSession
```js
{
  _id: ObjectId,
  participants: [{ type: ObjectId, ref: 'User' }],
  scheduledAt: Date,
  timezone: String,
  mode: String,
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
  reminderSent: { type: Boolean, default: false },
  createdAt: Date
}
```

### MatchQueue
```js
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User' },
  mode: String,
  targetLanguage: String,
  nativeLanguage: String,
  aiVector: [Number],       // anonymized embedding for matching
  status: { type: String, enum: ['waiting', 'matched', 'cancelled'] },
  matchedWith: { type: ObjectId, ref: 'User' },
  sessionId: { type: ObjectId, ref: 'Session' },
  joinedAt: Date,
  matchedAt: Date
}
```

### Feedback
```js
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User' },
  type: { type: String, enum: ['idea', 'bug', 'improvement', 'feature_request'] },
  title: String,
  description: String,
  votes: { type: Number, default: 0 },
  voters: [{ type: ObjectId, ref: 'User' }],
  status: { type: String, enum: ['submitted', 'reviewing', 'planned', 'in_progress', 'done', 'declined'] },
  aiAnalysis: {
    sentiment: String,
    category: String,
    priority: Number,
    tags: [String]
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Subscription
```js
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User' },
  stripeSubscriptionId: String,
  plan: String,
  period: { type: String, enum: ['weekly', 'monthly', '6months', 'yearly'] },
  status: String,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: { type: Boolean, default: false },
  createdAt: Date
}
```

### Report
```js
{
  _id: ObjectId,
  reporter: { type: ObjectId, ref: 'User' },
  reported: { type: ObjectId, ref: 'User' },
  sessionId: { type: ObjectId, ref: 'Session' },
  reason: String,
  description: String,
  status: { type: String, enum: ['pending', 'reviewed', 'action_taken', 'dismissed'] },
  actionTaken: String,
  reviewedBy: { type: ObjectId, ref: 'User' },
  createdAt: Date
}
```

### AIInsight
```js
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User' },
  sessionId: { type: ObjectId, ref: 'Session' },
  type: { type: String, enum: ['pronunciation', 'grammar', 'vocabulary', 'progress', 'weekly_report'] },
  content: Object,
  createdAt: Date
}
```

---

## 9. API ARCHITECTURE

Base: **Next.js App Router** (`/app/api/`)

### Auth
```
POST  /api/auth/register
POST  /api/auth/login
POST  /api/auth/logout
POST  /api/auth/verify-email
POST  /api/auth/forgot-password
POST  /api/auth/reset-password
```

### User
```
GET   /api/user/me
PATCH /api/user/me
GET   /api/user/[username]
POST  /api/user/avatar
POST  /api/user/voice-intro
```

### AI Preferences
```
GET   /api/ai-preferences
PUT   /api/ai-preferences
```

### Matching
```
POST  /api/match/join
DELETE /api/match/leave
GET   /api/match/status
```

### Sessions
```
POST  /api/session/create
GET   /api/session/[id]
PATCH /api/session/[id]/end
POST  /api/session/[id]/outcome
```

### Friends
```
GET   /api/friends
POST  /api/friends/request
PATCH /api/friends/[id]/accept
DELETE /api/friends/[id]
```

### Schedule
```
GET   /api/schedule
POST  /api/schedule
DELETE /api/schedule/[id]
```

### Feedback
```
GET   /api/feedback
POST  /api/feedback
POST  /api/feedback/[id]/vote
```

### Subscription
```
GET   /api/subscription
POST  /api/subscription/checkout
POST  /api/subscription/portal
POST  /api/subscription/webhook      ← Stripe webhook
```

### AI
```
POST  /api/ai/match-score
POST  /api/ai/generate-prompts
POST  /api/ai/analyze-feedback
POST  /api/ai/session-insights
POST  /api/ai/translate
GET   /api/ai/insights/[userId]
```

### Admin
```
GET   /api/admin/users
PATCH /api/admin/users/[id]/ban
GET   /api/admin/sessions
GET   /api/admin/reports
PATCH /api/admin/reports/[id]
GET   /api/admin/feedback/analysis
GET   /api/admin/analytics
```

### Real-time (Socket.io)
```
ws:// /api/socket

Events:
  match:found
  match:cancelled
  session:start
  session:end
  session:emoji-reaction
  session:video-request
  session:video-accepted
  session:video-declined
  webrtc:offer
  webrtc:answer
  webrtc:ice-candidate
  webrtc:peer-disconnected
```

---

## 10. AI ARCHITECTURE

**Provider:** OpenAI — GPT-4o (chat + structured output) + Whisper (STT) + text-embedding-3-small (vectors)

### Component 1 — Matching Engine
- Input: User A public profile + anonymized AI prefs vector + candidate pool
- Process: cosine similarity on interest embeddings + GPT-4o structured scoring for personality
- Output: compatibility score (0–100) per candidate

### Component 2 — Conversation Prompt Generator
- Input: mode + language pair + shared interests + session context
- Output: 3–5 conversation starters, follow-up questions (refreshed every 5 min)

### Component 3 — Real-time Translation
- Input: Whisper STT transcript chunk
- Output: translation + key vocabulary callouts

### Component 4 — Post-session Grammar Coach
- Input: full session transcript (Whisper)
- Output: top 3–5 grammar corrections with explanations

### Component 5 — Pronunciation Analyzer
- Input: audio segments (Whisper phoneme analysis)
- Output: pronunciation score (0–100) + specific word feedback

### Component 6 — Feedback Analyzer (batch, founder dashboard)
- Input: all community feedback since last run
- Output: sentiment distribution, category clusters, priority scores, trend summary, suggested roadmap

### Component 7 — Compatibility Optimizer
- Input: post-session private ratings + outcomes over time
- Process: adjust per-user matching weights
- Output: personalized matching vector per user

### AI Data Flow
```
User fills AI prefs → AES-256 encrypted → stored in DB
         ↓
Match requested → prefs decrypted in memory only (never logged)
         ↓
GPT-4o scores compatibility → score stored (prefs never cross users)
         ↓
Session starts → prompts generated → delivered via WebSocket
         ↓
Session ends → Whisper processes audio → insights generated → stored
         ↓
Private ratings collected → matching weights updated per user
```

---

## 11. MATCHING ALGORITHM

### Scoring Formula
```
totalScore = (
  languageScore    × 0.35 +
  interestScore    × 0.20 +
  timezoneScore    × 0.10 +
  personalityScore × 0.20 +
  comfortScore     × 0.15
)
```

### Score Components
| Component | Logic |
|-----------|-------|
| Language | exact pair = 100, overlapping = 60, partial = 30 |
| Interest | Jaccard similarity on interest tag sets |
| Timezone | <3hr diff = 100, <6hr = 70, >6hr = 30 |
| Personality | GPT-4o semantic similarity between style descriptions |
| Comfort | anxiety levels compatible + pace aligned + avoidance tags non-overlapping |

### Queue Logic
```
User joins queue with mode + target language
         ↓
Find all waiting users with compatible language pair
         ↓
Score all candidates → pick highest scorer ≥ 70
         ↓
No match after 60s → lower threshold to 55
No match after 120s → lower to 40 + notify user
No match after 180s → offer to wait or exit
         ↓
Match found → create Session doc → notify both via Socket.io
```

---

## 12. VOICE INFRASTRUCTURE

**Technology:** WebRTC (P2P audio/video) + Socket.io (signaling server)

### Connection Flow
```
User A opens /session/[id]
    → Connect Socket.io
    → getUserMedia({ audio: true })
    → Create RTCPeerConnection (with STUN/TURN config)
    → createOffer() → setLocalDescription()
    → emit webrtc:offer via socket

User B receives offer
    → setRemoteDescription(offer)
    → createAnswer() → setLocalDescription()
    → emit webrtc:answer via socket

Both exchange ICE candidates via socket
    → P2P audio stream established (DTLS-SRTP encrypted)

Video (optional):
    → User A clicks video button
    → emit session:video-request
    → User B sees consent dialog
    → If accepted: emit session:video-accepted
    → Both add video tracks to RTCPeerConnection
    → If declined: video-declined, no stream added

Session ends:
    → Stop all tracks
    → Close RTCPeerConnection
    → Disconnect socket room
    → POST /api/session/[id]/end
```

### Infrastructure
- **STUN:** Google public STUN (dev) → Cloudflare TURN (production)
- **Signaling:** Socket.io on Next.js custom server (or dedicated Node.js for scale)
- **Recording:** MediaRecorder API (premium + both consent) → upload to Cloudflare R2
- **Audio Processing:** Whisper API (chunked post-session)
- **Waveform:** Web Audio API AnalyserNode → canvas visualization

---

## 13. SECURITY ARCHITECTURE

### Authentication
- NextAuth.js v5 — JWT sessions, httpOnly cookies, CSRF protection built-in
- Google OAuth 2.0
- Credentials provider with bcrypt (cost factor 12)

### Data Protection
- AI Preferences: AES-256-GCM encrypted at application layer before DB write
- Encryption key: stored in env var, never in DB
- AI prefs decrypted in memory only during matching — never logged, never returned to client after initial save

### API Security
- Rate limiting: Upstash Redis (or in-memory map for MVP)
- CORS: strict origin whitelist
- Input validation: Zod schemas on all routes
- Admin routes: role check middleware
- Webhook endpoints: Stripe signature verification

### Transport Security
- WebRTC: DTLS-SRTP (built into spec — encrypted by default)
- HTTPS everywhere (Vercel enforced)
- Socket.io over WSS

### Privacy Design
- Session audio: not stored unless premium AND both users consent
- Match scoring: only scores stored — prefs never cross between users
- AI prefs: never returned in any GET response after initial setup
- Data export: GDPR endpoint
- Account deletion: cascade delete all user data

---

## 14. MODERATION SYSTEM

### Automated
- 3 reports against same user in 7 days → auto-suspend, pending admin review
- Profanity filter on text messages (bad-words library)
- Report timestamp logged with session context

### Manual (Admin)
- Report queue with reporter + reported + session details
- Actions: warn / 7-day ban / 30-day ban / permanent ban
- Ban reason stored + emailed to user
- Appeals: email support flow

### User Controls
- Block user (prevents future matching, removes from friend list)
- In-session report button (one click, visible during session)
- End session immediately (no confirmation required)

---

## 15. ADMIN DASHBOARD

| Section | Content |
|---------|---------|
| Overview | DAU, sessions today, active now, revenue today, open reports count |
| Users | Search + filter, profile preview, ban/unban, view session history |
| Sessions | Active sessions count, completed today, flagged for review |
| Reports | Pending queue, full report detail, one-click action buttons |
| Feedback | All submissions, status management, AI analysis view |
| Feature Flags | Toggle on/off per feature, per plan, per user group |
| AI Config | Edit system prompts for matching, coaching, prompts |
| Analytics | Charts: DAU, session length, retention cohorts, plan conversions |

---

## 16. FOUNDER DASHBOARD

AI-powered insights page (GPT-4o batch analysis, runs daily):

| Widget | Data |
|--------|------|
| Feedback Trends | Line chart — submissions over time by category |
| Sentiment | Donut — positive / neutral / negative % |
| Top Requested | Ranked list with vote counts |
| Pain Points | Category heatmap |
| Retention Risk | Users with declining engagement flagged |
| AI Roadmap | Ordered feature suggestions with reasoning |
| Cohort Retention | W1 / W2 / W4 table |
| Revenue | MRR, ARR, plan split, monthly churn rate |
| Session Quality | Avg duration, completion rate, rematch rate |

---

## 17. WIREFRAMES

### Landing Page
```
┌─────────────────────────────────────────────────┐
│ LOGO          Features  Pricing  Login  [Start] │
├─────────────────────────────────────────────────┤
│                                                 │
│   "Speak Any Language. Connect Anywhere."       │
│   Practice with real people through voice       │
│                                                 │
│   [Start Free — No Credit Card]  [How It Works] │
│                                                 │
│         🌍 animated globe + voice waves         │
│                                                 │
├─────────────────────────────────────────────────┤
│  🌐 50,000 speakers · 120 countries · 40 langs  │
├─────────────────────────────────────────────────┤
│  HOW IT WORKS                                   │
│  1. Build profile  2. Tell AI  3. Match  4. Talk│
├─────────────────────────────────────────────────┤
│  FEATURES  (6 cards, 2×3 grid)                  │
├─────────────────────────────────────────────────┤
│  CONVERSATION MODES  (7 cards)                  │
├─────────────────────────────────────────────────┤
│  PRICING  (Free / Monthly / Yearly toggle)      │
├─────────────────────────────────────────────────┤
│  TESTIMONIALS                                   │
├─────────────────────────────────────────────────┤
│  "Your next conversation starts in 30 seconds"  │
│                    [Get Started]                │
├─────────────────────────────────────────────────┤
│  FOOTER: Links · Privacy · Terms · Social       │
└─────────────────────────────────────────────────┘
```

### Dashboard
```
┌──────┬──────────────────────────────────────────┐
│      │  Good morning, Maria ☀️                  │
│ LOGO │                                          │
│      │  ┌─────────────────────────────────┐    │
│ Home │  │   🎤  FIND A CONVERSATION       │    │
│      │  │      [Quick Match — large CTA]  │    │
│ Match│  └─────────────────────────────────┘    │
│      │                                          │
│Friends  Today: 3 sessions · 2 friends · 🔥5    │
│      │                                          │
│Sched.│  ┌──────────────┐  ┌─────────────────┐ │
│      │  │ Scheduled     │  │ AI Weekly       │ │
│Comm. │  │ Sessions      │  │ Insight         │ │
│      │  └──────────────┘  └─────────────────┘ │
│Settings  Friend Activity Feed ↓                │
└──────┴──────────────────────────────────────────┘
```

### Voice Session
```
┌─────────────────────────────────────────────────┐
│                  ● REC  12:34                   │
│                                                 │
│              ┌───────────┐                      │
│              │  AVATAR   │                      │
│              │  Maria    │                      │
│              │  🇯🇵 JP   │                      │
│              └───────────┘                      │
│                                                 │
│     ~~~~~ voice waveform animation ~~~~~        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 💡 "What's your favorite local food?"  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌────┬────┬────┬──────────┬───────────────┐   │
│  │ 🎤 │ 📹 │ 😊 │  Prompts │      End      │   │
│  └────┴────┴────┴──────────┴───────────────┘   │
└─────────────────────────────────────────────────┘
```

### Onboarding Wizard
```
Step 1 ●○○○○  "What's your name?"
              [Avatar upload] [Display name input]

Step 2 ○●○○○  "Where are you from?"
              [Country picker] [Timezone auto-detect]

Step 3 ○○●○○  "What languages?"
              [Native tags] [Learning tags + level]

Step 4 ○○○●○  "What are you into?"
              [Interest tag grid — multiselect]

Step 5 ○○○○●  "How do you prefer to chat?" (AI prefs)
              [Sliders + preference selects]
              🔒 "Only AI sees this — never other users"
```

---

## 18. DESIGN SYSTEM

**Component Base:** Shadcn/ui + custom extensions

### Core Components
| Component | Notes |
|-----------|-------|
| Button | primary / secondary / ghost / destructive |
| Card | glass variant (dark) + clean (light) |
| Avatar | with online indicator ring |
| Badge | language level, plan type, country |
| Dialog / Modal | standard + fullscreen session variant |
| Sheet | mobile slide-up panels |
| Progress | onboarding steps |
| Slider | AI preference inputs |
| Toggle Group | mode selection |
| Tabs | profile sections |
| Toast | notifications |
| Skeleton | loading states |
| WaveformVisualizer | custom — Web Audio API canvas |
| LanguageBadge | custom — flag + code + level |
| InterestTag | custom — colored by category |
| MatchScoreRing | custom — animated SVG circle |
| EmojiReaction | custom — float + fade animation |
| ModeCard | custom — icon + label + description |

### Motion System (Framer Motion)
| Interaction | Animation |
|-------------|-----------|
| Page transition | crossfade 200ms |
| Onboarding step | slide left/right 300ms |
| Match found | pulse + scale reveal |
| Emoji reaction | float up + fade 1200ms |
| Session end | dissolve 500ms |
| Card hover | lift (translateY -2px) + shadow |
| Modal open | scale 0.95→1 + fade |

---

## 19. COLOR PALETTE

### Dark Mode
```
Background ........... #0A0A0F   (near-black, blue undertone)
Surface .............. #13131A   (cards)
Surface Hover ........ #1C1C28
Border ............... #2A2A3D
Accent Purple ........ #7C3AED   (primary actions)
Accent Blue .......... #3B82F6   (secondary)
Accent Pink .......... #EC4899   (flirty mode, highlights)
Text Primary ......... #F8F8FF
Text Secondary ....... #94A3B8
Text Muted ........... #4B5563
Success .............. #10B981
Warning .............. #F59E0B
Error ................ #EF4444
```

### Light Mode
```
Background ........... #FAFAFA
Surface .............. #FFFFFF
Surface Hover ........ #F5F5F5
Border ............... #E5E7EB
Accent Purple ........ #7C3AED
Accent Blue .......... #3B82F6
Accent Pink .......... #EC4899
Text Primary ......... #0F172A
Text Secondary ....... #64748B
Text Muted ........... #94A3B8
Success .............. #059669
Warning .............. #D97706
Error ................ #DC2626
```

### Glassmorphism Tokens
```css
/* Dark */
--glass-bg: rgba(19, 19, 26, 0.70);
--glass-border: rgba(255, 255, 255, 0.08);
backdrop-filter: blur(20px);

/* Light */
--glass-bg: rgba(255, 255, 255, 0.70);
--glass-border: rgba(0, 0, 0, 0.08);
backdrop-filter: blur(20px);
```

---

## 20. TYPOGRAPHY SYSTEM

**Fonts:** Inter (display + body) · JetBrains Mono (data/code)

### Scale
| Token | Size | Weight | Use |
|-------|------|--------|-----|
| display-2xl | 72px | 800 | Hero headline |
| display-xl | 60px | 800 | Section hero |
| display-lg | 48px | 700 | Page titles |
| display-md | 36px | 700 | Section titles |
| display-sm | 30px | 600 | Card titles |
| text-xl | 20px | 600 | Subheadings |
| text-lg | 18px | 500 | Lead text |
| text-base | 16px | 400 | Body |
| text-sm | 14px | 400/500 | Labels, captions |
| text-xs | 12px | 400 | Metadata |

---

## 21. LANDING PAGE STRUCTURE

```
1. Navbar
   Logo · Features · Pricing · Community · Login · [Get Started]

2. Hero
   Headline: "Speak Any Language. Connect Anywhere."
   Sub: "Practice with real people through voice conversations.
         AI matches you with your perfect partner."
   CTA: [Start Free — No Credit Card] [See How It Works]
   Visual: animated globe, voice waveforms connecting city dots

3. Trust Bar
   "X speakers · Y countries · Z languages"
   Animated flag row

4. How It Works (4 steps)
   Build profile → Tell AI privately → Get matched → Start speaking

5. Feature Cards (2×3 grid)
   Voice-First · AI Matching · Private Preferences
   7 Modes · Friend System · Language Coaching

6. Conversation Modes Showcase
   7 mode cards with icons + descriptions

7. AI + Privacy Section
   "AI that understands you, not just your language"
   Privacy-first messaging · matching quality proof

8. Social Proof
   Testimonials · language stats · session counts

9. Pricing
   Toggle: Monthly / Yearly
   Cards: Free / Premium
   Feature comparison table

10. Community Section
    "Built with our users" — feedback system preview

11. FAQ (6–8 questions)

12. Final CTA
    "Your next conversation is 30 seconds away"
    [Start Speaking Free]

13. Footer
    Product · Company · Legal · Social
```

---

## 22. GROWTH STRATEGY

### Pre-launch
- Build in public (Twitter/X, TikTok dev journey)
- Waitlist with referral mechanism (Viral Loops)
- Seed 50–100 beta users from language learning communities
- r/languagelearning, r/LearnJapanese, Discord language servers

### Launch
- ProductHunt launch (Tuesday 12:01 AM PT)
- HackerNews "Show HN"
- Language learning influencers (TikTok/YouTube)
- Content: "I spoke Japanese with a stranger for 10 minutes — here's what happened"

### Retention Loops
- Weekly AI progress email report
- Streak system (sessions per week)
- Friend activity feed (social pull)
- Scheduled session reminders
- "Your match is waiting" push notification

### Viral Mechanics
- Invite friend → practice together (strong use case)
- "I spoke 3 languages this week" shareable card
- Referral = 1 week premium

### SEO
- Target: "practice [language] with native speakers", "language exchange app"
- Blog: language learning tips, culture guides, grammar deep dives

---

## 23. MONETIZATION STRATEGY

### Pricing
| Plan | Price | Effective/mo |
|------|-------|-------------|
| Free | $0 | — |
| Weekly | $4.99 | $21.60 |
| Monthly | $12.99 | $12.99 |
| 6 Months | $49.99 | $8.33 |
| Yearly | $79.99 | $6.67 |

### Free Tier Design (friction points that drive upgrades)
- 3–5 sessions/day limit → upgrade prompt on limit hit
- Basic matching only → "country targeting" teaser
- Limited AI prompts → "unlock unlimited AI coach"
- No private mode → "hide your profile"

### Upgrade Triggers
- Daily session limit reached
- Wanting specific country targeting
- Wanting pronunciation analysis
- Wanting session recordings
- Wanting advanced filters

### Revenue Targets
| Milestone | MAU | Premium % | MRR |
|-----------|-----|-----------|-----|
| Month 3 | 2,000 | 8% | $2,000 |
| Month 6 | 8,000 | 10% | $10,400 |
| Month 12 | 25,000 | 12% | $39,000 |

### Future Revenue Streams
- B2B licenses (language schools, corporations)
- White-label API for other language platforms
- Sponsored cultural exchange events

---

## 24. TECHNICAL ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                    Vercel CDN                       │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│              Next.js App (App Router)               │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ UI Layer │  │  API Routes  │  │   Socket.io   │ │
│  │ React +  │  │  (REST+AI)   │  │  (WebRTC sig) │ │
│  │  Shadcn  │  └──────┬───────┘  └───────┬───────┘ │
│  └──────────┘         │                  │         │
└───────────────────────┼──────────────────┼─────────┘
                        │                  │
┌───────────────────────▼──────────────────▼─────────┐
│                  Middleware Layer                   │
│        Auth · Rate Limit · Zod Validation          │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│                   Service Layer                     │
│  UserService · MatchService · AIService            │
│  SessionService · PaymentService · FeedbackService │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              MongoDB + Mongoose                     │
│               (MongoDB Atlas M10+)                 │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│               External Services                     │
│  OpenAI · Stripe · Cloudflare R2 · Cloudflare TURN │
│  Resend (email) · Uploadthing (file upload)        │
└─────────────────────────────────────────────────────┘
```

**Tech Stack Summary**
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, TailwindCSS |
| Components | Shadcn/ui |
| Animation | Framer Motion |
| Backend | Next.js API Routes + custom Socket.io server |
| Database | MongoDB (Atlas) + Mongoose |
| Auth | NextAuth.js v5 |
| Real-time | Socket.io |
| Voice/Video | WebRTC |
| AI | OpenAI (GPT-4o, Whisper, embeddings) |
| Payments | Stripe |
| File Storage | Cloudflare R2 via Uploadthing |
| Email | Resend |
| TURN | Cloudflare TURN |
| Deployment | Vercel |

---

## 25. DEVELOPMENT ROADMAP

---

### PHASE 1 — FRONTEND (Weeks 1–3)
> Goal: Complete UI shell. All pages. Design system. Zero real data — mock only.

**Project Bootstrap**
```bash
npx create-next-app@latest speakfirst --typescript --tailwind --app --src-dir
npx shadcn@latest init
npm install framer-motion next-themes lucide-react
npm install @uploadthing/react uploadthing
```

**Folder Structure**
```
/src
  /app
    /layout.tsx                ← root layout, ThemeProvider
    /page.tsx                  ← landing page
    /(auth)
      /login/page.tsx
      /register/page.tsx
      /verify-email/page.tsx
    /(onboarding)
      /layout.tsx              ← wizard wrapper
      /profile/page.tsx
      /ai-preferences/page.tsx
      /languages/page.tsx
      /interests/page.tsx
      /mode/page.tsx
    /(app)
      /layout.tsx              ← sidebar + navbar
      /dashboard/page.tsx
      /match/page.tsx
      /session/[id]/page.tsx
      /friends/page.tsx
      /schedule/page.tsx
      /profile/[username]/page.tsx
      /settings/...
      /community/...
    /(admin)
      /layout.tsx              ← admin guard
      /dashboard/page.tsx
      /users/page.tsx
      /reports/page.tsx
      /feedback/page.tsx
      /analytics/page.tsx
    /api/                      ← empty stubs in Phase 1
  /components
    /ui/                       ← shadcn components
    /shared/                   ← Navbar, Sidebar, ThemeToggle, MobileNav
    /landing/                  ← Hero, Features, Pricing, HowItWorks, FAQ
    /onboarding/               ← WizardStep, LanguageSelector, InterestGrid
    /session/                  ← VoiceControls, Waveform, EmojiReaction, PromptPanel
    /match/                    ← QueueCard, MatchFoundModal, ModeSelector
    /profile/                  ← ProfileCard, LanguageBadge, InterestTag
    /admin/                    ← DataTable, StatsCard, ReportRow
    /founder/                  ← SentimentChart, FeedbackTrend, AIRoadmap
  /lib
    /utils.ts
    /constants.ts
    /mock-data.ts
  /hooks
    /use-theme.ts
    /use-media-devices.ts
  /types
    /index.ts
  /styles
    /globals.css
```

**Phase 1 Deliverables Checklist**
- [ ] Tailwind config with full custom design system (colors, fonts, shadows)
- [ ] Shadcn init + component customization
- [ ] Dark/Light theme (next-themes, moon/sun toggle, localStorage persist)
- [ ] Root layout + route group layouts
- [ ] Landing page — all 13 sections, fully responsive
- [ ] Auth pages (login, register, verify) — forms UI only
- [ ] Onboarding wizard — 5 steps, progress bar, transitions
- [ ] Dashboard page — sidebar, stats, quick match CTA
- [ ] Match queue page — waiting state, mode selection
- [ ] Voice session page — full UI, waveform component, controls
- [ ] Post-session modal — all outcome options
- [ ] Profile page — public view
- [ ] Friends page — list, requests
- [ ] Settings pages — account, privacy, AI prefs, subscription
- [ ] Community feedback page
- [ ] Admin dashboard — all sections with mock data
- [ ] Founder dashboard — charts with mock data (Recharts)
- [ ] Pricing / subscription page
- [ ] All loading states + skeleton loaders
- [ ] All empty states
- [ ] Mobile responsive (375px baseline)
- [ ] Framer Motion: page transitions, card hovers, modal animations

---

### PHASE 2 — BACKEND + MONGOOSE (Weeks 4–6)
> Goal: Full API, real database, all mock data replaced.

**Dependencies**
```bash
npm install mongoose
npm install zod
npm install bcryptjs
npm install socket.io socket.io-client
npm install @types/bcryptjs
```

**Deliverables Checklist**
- [ ] `/lib/db.ts` — Mongoose singleton connection
- [ ] `/lib/models/` — all 10 Mongoose schemas
- [ ] `/lib/validations/` — Zod schemas for every API input
- [ ] `/lib/services/` — business logic separated from route handlers
- [ ] API: Auth (register, login, logout, verify, reset password)
- [ ] API: User CRUD (me, update, avatar upload, voice intro)
- [ ] API: AI Preferences (get, put — with AES-256 encryption)
- [ ] API: Match Queue (join, leave, status)
- [ ] API: Sessions (create, get, end, outcome)
- [ ] API: Friends (list, request, accept, remove)
- [ ] API: Schedule (list, create, delete)
- [ ] API: Feedback (list, create, vote)
- [ ] API: Admin endpoints
- [ ] Socket.io server setup (custom Next.js server or standalone)
- [ ] WebRTC signaling events via Socket.io rooms
- [ ] File upload: Uploadthing integration (avatar + voice intro)
- [ ] Rate limiting middleware (per-IP, per-user)
- [ ] Error handling middleware (consistent JSON error responses)
- [ ] Replace all mock data in frontend with real API calls
- [ ] React Query or SWR for data fetching + caching

---

### PHASE 3 — AUTH MODULE (Week 5, parallel with Phase 2)
> Goal: Secure, production-ready authentication end-to-end.

**Dependencies**
```bash
npm install next-auth@beta @auth/mongodb-adapter
npm install resend
```

**Deliverables Checklist**
- [ ] NextAuth v5 config (`/auth.ts`)
- [ ] Google OAuth provider setup (Google Cloud Console)
- [ ] Credentials provider (email + bcrypt password)
- [ ] Email verification flow (token → Resend email → verify endpoint)
- [ ] Password reset flow (token → Resend email → reset endpoint)
- [ ] MongoDB adapter for session persistence
- [ ] Protected route middleware (`/middleware.ts`)
- [ ] `useSession` hook wired to all authenticated pages
- [ ] Onboarding completion gate (redirect incomplete profiles)
- [ ] Admin role guard on all `/admin` routes
- [ ] Logout flow + session cleanup

---

### PHASE 4 — WEBRTC + VOICE (Weeks 6–7)
> Goal: Live voice sessions working end-to-end, peer-to-peer.

**Deliverables Checklist**
- [ ] Socket.io signaling server (rooms per session ID)
- [ ] RTCPeerConnection setup utility
- [ ] SDP offer/answer exchange via socket events
- [ ] ICE candidate trickle via socket
- [ ] `getUserMedia` with permission error handling
- [ ] Audio stream to remote peer
- [ ] Mute/unmute local audio track
- [ ] Speaking indicator — Web Audio AnalyserNode → waveform canvas
- [ ] Video consent flow (request → accept/decline → track add/remove)
- [ ] Session timer (client-side countdown + socket sync)
- [ ] Emoji reaction broadcast (Socket.io room broadcast)
- [ ] Reconnection handling (peer disconnect → retry → session end)
- [ ] STUN/TURN config (Cloudflare TURN credentials from env)
- [ ] Session end cleanup (stop tracks, close connection, POST end)
- [ ] Mobile: handle audio focus, background tab behavior

---

### PHASE 5 — AI INTEGRATION (Weeks 7–9)
> Goal: All AI features live and connected.

**Dependencies**
```bash
npm install openai
```

**Deliverables Checklist**
- [ ] OpenAI client config + error handling
- [ ] Matching engine: GPT-4o structured scoring + embedding cosine similarity
- [ ] Queue processor: score candidates → select best match
- [ ] Conversation prompt generator (mode-aware, interest-aware)
- [ ] Real-time translation endpoint (Whisper chunk → GPT-4o translate)
- [ ] Post-session grammar analysis (transcript → corrections)
- [ ] Pronunciation scoring (Whisper phoneme output processing)
- [ ] AI Insights storage + frontend display
- [ ] Feedback batch analyzer (daily cron → founder dashboard)
- [ ] Weekly AI report email (Resend template)
- [ ] Prompt engineering: test + iterate on all prompts
- [ ] Token usage monitoring + per-user cost limits
- [ ] Fallback handling (OpenAI downtime → graceful degrade)

---

### PHASE 6 — PAYMENTS (Week 8)
> Goal: Stripe subscriptions working, plan enforcement enforced.

**Dependencies**
```bash
npm install stripe @stripe/stripe-js
```

**Deliverables Checklist**
- [ ] Stripe products + prices created (4 billing periods)
- [ ] Checkout session API route
- [ ] Stripe webhook handler (`/api/subscription/webhook`)
- [ ] Webhook events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
- [ ] Subscription status sync to User + Subscription collection
- [ ] Plan enforcement: daily session limit on free tier
- [ ] Premium feature gate utility function
- [ ] Stripe billing portal (manage/cancel subscription)
- [ ] Contextual upgrade prompts (on limit hit, on premium feature access)
- [ ] Payment confirmation email (Resend)
- [ ] Subscription expiry warning email (3 days before)

---

### PHASE 7 — MODERATION + ADMIN (Week 9)
> Goal: Safe platform, full admin control.

**Deliverables Checklist**
- [ ] In-session + post-session report submission
- [ ] Auto-flag logic (3 reports → suspend)
- [ ] Admin report queue with full context
- [ ] Ban/unban API with reason storage
- [ ] Block user (client-side + matching exclusion)
- [ ] Feature flags system (DB-backed)
- [ ] Admin analytics charts (Recharts: DAU, retention, conversion)
- [ ] Founder AI dashboard wired to GPT-4o batch analysis
- [ ] Feedback status management (admin → updates visible to users)
- [ ] Data export endpoints (GDPR)
- [ ] Account deletion cascade

---

### PHASE 8 — POLISH + LAUNCH (Week 10)
> Goal: Production-ready, performant, secure.

**Deliverables Checklist**
- [ ] React error boundaries on all route segments
- [ ] Suspense boundaries + skeleton states everywhere
- [ ] Empty states for all list views
- [ ] Mobile QA (iOS Safari + Android Chrome)
- [ ] Lighthouse score: Performance 90+, Accessibility 95+
- [ ] OWASP top-10 self-audit
- [ ] Privacy policy + Terms of service pages
- [ ] Cookie consent banner
- [ ] Dynamic OG images (Next.js `ImageResponse`)
- [ ] Sitemap + robots.txt
- [ ] Meta tags (title, description, og, twitter) on all pages
- [ ] Vercel Analytics integration
- [ ] Sentry error tracking (frontend + API)
- [ ] Environment variable audit (nothing secret in client bundle)
- [ ] MongoDB Atlas production cluster (M10+, backups enabled)
- [ ] Vercel production deploy
- [ ] Custom domain + SSL
- [ ] Full smoke test: sign up → onboard → match → session → pay → admin

---

## SUMMARY

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Frontend — all pages, design system, mock data | Weeks 1–3 |
| 2 | Backend — Mongoose, all APIs, real data | Weeks 4–6 |
| 3 | Auth — NextAuth, Google, email/password, guards | Week 5 (parallel) |
| 4 | WebRTC — voice sessions, signaling, video consent | Weeks 6–7 |
| 5 | AI — matching, coaching, prompts, insights | Weeks 7–9 |
| 6 | Payments — Stripe, webhooks, plan enforcement | Week 8 |
| 7 | Moderation + Admin — reports, bans, analytics | Week 9 |
| 8 | Polish + Launch — QA, perf, security, deploy | Week 10 |

**Total: ~10 weeks to MVP launch**
