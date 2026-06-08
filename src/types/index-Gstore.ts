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

export interface AIPreferences {
  personality: string
  comfortLevel: number
  socialAnxietyLevel: number
  topicsToAvoid: string
  pace: "Slow" | "Medium" | "Fast"
  style: "Formal" | "Casual"
}

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
