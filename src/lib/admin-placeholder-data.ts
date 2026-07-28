import type { Feedback } from "@/types"

/**
 * Placeholder content for the admin console.
 *
 * None of this is real: the admin dashboards were built against invented rows
 * before the reporting backend existed. It is isolated here, and named for what
 * it is, so no user-facing surface can import fabricated numbers by accident.
 * Replace each export with a real query as its backend lands.
 */
export const mockFeedback: Feedback[] = [
  {
    id: "f1",
    type: "idea",
    title: "Add a daily speaking streak challenge",
    description: "A gamified daily goal that rewards consistent speaking practice with badges.",
    votes: 248,
    status: "planned",
    author: "Sofia Martínez",
    authorInitials: "SM",
    createdAt: "2026-05-20",
    hasVoted: false,
  },
  {
    id: "f2",
    type: "feature",
    title: "Real-time subtitle translation during calls",
    description: "Show live translated captions so beginners can follow along more easily.",
    votes: 412,
    status: "in-progress",
    author: "Amara Okafor",
    authorInitials: "AO",
    createdAt: "2026-05-18",
    hasVoted: true,
  },
  {
    id: "f3",
    type: "bug",
    title: "Microphone stays muted after reconnect",
    description: "When the connection drops and reconnects, the mic toggle shows unmuted but no audio is sent.",
    votes: 76,
    status: "open",
    author: "Kenji Tanaka",
    authorInitials: "KT",
    createdAt: "2026-05-22",
    hasVoted: false,
  },
  {
    id: "f4",
    type: "feature",
    title: "Group conversation rooms (3-4 people)",
    description: "Let small groups practice together in topic-based rooms.",
    votes: 189,
    status: "open",
    author: "Lucas Almeida",
    authorInitials: "LA",
    createdAt: "2026-05-15",
    hasVoted: false,
  },
  {
    id: "f5",
    type: "idea",
    title: "Voice intro recordings on profiles",
    description: "Let users record a short voice intro so partners hear their voice before matching.",
    votes: 134,
    status: "shipped",
    author: "Chloé Dubois",
    authorInitials: "CD",
    createdAt: "2026-05-10",
    hasVoted: true,
  },
]

export const dauTrend: { day: string; users: number }[] = [
  { day: "May 1", users: 6200 },
  { day: "May 5", users: 6800 },
  { day: "May 9", users: 7100 },
  { day: "May 13", users: 6900 },
  { day: "May 17", users: 7600 },
  { day: "May 21", users: 8000 },
  { day: "May 25", users: 8200 },
  { day: "May 29", users: 8421 },
]

export const sessionsByMode: { mode: string; sessions: number }[] = [
  { mode: "Friendly", sessions: 540 },
  { mode: "Casual", sessions: 720 },
  { mode: "Deep", sessions: 410 },
  { mode: "Cultural", sessions: 380 },
  { mode: "Study", sessions: 290 },
  { mode: "Fast", sessions: 210 },
  { mode: "Flirty", sessions: 160 },
]

export const sentimentData: { name: string; value: number; color: string }[] = [
  { name: "Positive", value: 68, color: "#22c55e" },
  { name: "Neutral", value: 24, color: "#a1a1aa" },
  { name: "Negative", value: 8, color: "#ef4444" },
]

export const mrrData: { month: string; mrr: number }[] = [
  { month: "Dec", mrr: 12000 },
  { month: "Jan", mrr: 18500 },
  { month: "Feb", mrr: 24300 },
  { month: "Mar", mrr: 31200 },
  { month: "Apr", mrr: 38900 },
  { month: "May", mrr: 47600 },
]

export const roadmapSuggestions: { title: string; rationale: string; impact: "High" | "Medium" | "Low" }[] = [
  {
    title: "Ship real-time subtitle translation",
    rationale: "Highest-voted feature; strongly correlates with beginner retention.",
    impact: "High",
  },
  {
    title: "Group conversation rooms",
    rationale: "Rising demand from power users; could lift session frequency.",
    impact: "Medium",
  },
  {
    title: "Daily speaking streak challenge",
    rationale: "Gamification proven to increase D7 retention in similar apps.",
    impact: "High",
  },
]

export const retentionRisks: { signal: string; severity: "High" | "Medium" | "Low"; detail: string }[] = [
  {
    signal: "Beginner drop-off after first session",
    severity: "High",
    detail: "32% of beginners do not return after their first match. Onboarding pace may feel too fast.",
  },
  {
    signal: "Match wait time on niche languages",
    severity: "Medium",
    detail: "Average wait for Korean learners is 2m 40s vs 35s overall.",
  },
  {
    signal: "Premium trial conversion dip",
    severity: "Low",
    detail: "Trial-to-paid down 3% week-over-week. Monitor pricing page experiment.",
  },
]

export const adminReports: {
  id: string
  reporter: string
  reported: string
  reason: string
  session: string
  date: string
  status: "pending" | "reviewed" | "dismissed"
}[] = [
  {
    id: "r1",
    reporter: "amara",
    reported: "ghost_user_22",
    reason: "Inappropriate language during call",
    session: "s-9921",
    date: "2026-05-29",
    status: "pending",
  },
  {
    id: "r2",
    reporter: "kenji",
    reported: "spam_bot_07",
    reason: "Sharing external links repeatedly",
    session: "s-9904",
    date: "2026-05-29",
    status: "pending",
  },
  {
    id: "r3",
    reporter: "chloe",
    reported: "rude_caller_3",
    reason: "Harassment",
    session: "s-9888",
    date: "2026-05-28",
    status: "reviewed",
  },
  {
    id: "r4",
    reporter: "lucas",
    reported: "afk_user_9",
    reason: "Left immediately / no-show",
    session: "s-9870",
    date: "2026-05-27",
    status: "dismissed",
  },
]

