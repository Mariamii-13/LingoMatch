export type Plan = "free" | "premium"

export type LanguageLevel = "Beginner" | "Intermediate" | "Advanced" | "Native"

export interface Language {
  code: string
  name: string
  flag: string
  level: LanguageLevel
}

export interface User {
  id: string
  name: string
  username: string
  country: string
  flag: string
  avatarInitials: string
  avatarColor: string
  bio?: string
  native: Language[]
  learning: Language[]
  interests: string[]
  plan: Plan
  online?: boolean
  memberSince: string
  sessionsCount: number
  friendsCount: number
}

export interface Friend extends User {
  status: "friend" | "incoming" | "suggested"
  lastActive?: string
}

export interface Session {
  id: string
  partner: Pick<User, "id" | "name" | "username" | "flag" | "avatarInitials" | "avatarColor">
  type: "chat" | "video"
  mode: string
  language: string
  date: string
  durationMinutes: number
  rating?: number
}

export type FeedbackType = "idea" | "bug" | "feature"
export type FeedbackStatus = "open" | "planned" | "in-progress" | "shipped" | "closed"

export interface Feedback {
  id: string
  type: FeedbackType
  title: string
  description: string
  votes: number
  status: FeedbackStatus
  author: string
  authorInitials: string
  createdAt: string
  hasVoted?: boolean
}

export interface ScheduledSession {
  id: string
  partner: Pick<User, "id" | "name" | "username" | "flag" | "avatarInitials" | "avatarColor">
  type: "chat" | "video"
  mode: string
  language: string
  date: string
  time: string
  timezone: string
}

export interface ConversationMode {
  id: string
  name: string
  emoji: string
  description: string
}

export type ConversationGoal =
  | "Language Practice"
  | "New Friends"
  | "Cultural Exchange"
  | "Daily Conversations"
  | "Deep Discussions"
  | "Casual Chat"
  | "Flirty Vibe"
  | "Anything"

export type MatchingPriority =
  | "Same language goals"
  | "Same interests"
  | "Similar personality"
  | "Similar communication style"
  | "Similar age"
  | "Surprise me"

export type PreferredTrait =
  | "Patient"
  | "Funny"
  | "Curious"
  | "Supportive"
  | "Talkative"
  | "Good Listener"
  | "Calm"
  | "Open-minded"

export type TopicToAvoid =
  | "No Preference"
  | "Politics"
  | "Religion"
  | "Dating"
  | "Personal Finance"
  | "Mental Health"
  | "Family Topics"
  | "Other"

export interface AIProfile {
  conversationGoals: ConversationGoal[]
  matchingPriority: MatchingPriority | ""
  socialEnergy: number
  comfortLevel: number
  socialAnxietyLevel: number
  pace: "Slow" | "Medium" | "Fast"
  style: "Formal" | "Casual"
  preferredTraits: PreferredTrait[]
  personalityNotes: string
  topicsToAvoid: TopicToAvoid[]
  aiConversationStarters: boolean
}

/** @deprecated use AIProfile */
export type AIPreferences = AIProfile

export interface Stats {
  totalSessions: number
  totalFriends: number
  streakDays: number
  languagesLearned: number
}

export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "session_reminder"
  | "streak"
  | "match"

export interface Notification {
  id: string
  type: NotificationType
  read: boolean
  timestamp: string
  message: string
  actor?: {
    name: string
    initials: string
    avatarColor: string
  }
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderInitials: string
  senderAvatarColor: string
  content: string
  createdAt: string
}

export interface Conversation {
  id: string
  type: "chat" | "video"
  partner: Pick<User, "id" | "name" | "username" | "flag" | "avatarInitials" | "avatarColor">
  language: string
  status: "active" | "ended"
  lastMessage?: Pick<Message, "content" | "createdAt">
  unreadCount: number
  startedAt: string
}

export type MatchPhase = "idle" | "configuring" | "prejoin" | "searching" | "found"

export interface MatchResult {
  conversationId: string
  partner: Pick<
    User,
    "id" | "name" | "username" | "country" | "flag" | "avatarInitials" | "avatarColor" | "native" | "learning" | "interests"
  >
  compatibilityPct: number
}
