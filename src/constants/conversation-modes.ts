import type { ConversationMode } from "@/types"

/** The practice styles a user can opt into. Real product config, not sample data. */
export const conversationModes: ConversationMode[] = [
  {
    id: "friendly",
    name: "Friendly",
    emoji: "🤝",
    description: "Relaxed, no-pressure chats to make a new friend across the world.",
  },
  {
    id: "casual",
    name: "Casual Practice",
    emoji: "☕",
    description: "Everyday small talk to keep your skills sharp and natural.",
  },
  {
    id: "deep",
    name: "Deep Conversations",
    emoji: "🌌",
    description: "Meaningful talks about life, ideas, and the things that matter.",
  },
  {
    id: "cultural",
    name: "Cultural Exchange",
    emoji: "🌍",
    description: "Trade traditions, food, music and stories from your home.",
  },
  {
    id: "study",
    name: "Study Together",
    emoji: "📚",
    description: "Focused practice with grammar drills and vocab building.",
  },
  {
    id: "fast",
    name: "Fast Speaking Practice",
    emoji: "⚡",
    description: "High-tempo speaking to push fluency and quick thinking.",
  },
  {
    id: "flirty",
    name: "Flirty Vibes",
    emoji: "💘",
    description: "Playful, light-hearted banter for the confident speaker.",
  },
]

