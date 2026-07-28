/** Interest taxonomy offered during setup. Real product config, not sample data. */
export const interestCategories: {
  key: string
  category: string
  emoji: string
  subInterests: string[]
}[] = [
  {
    key: "entertainment",
    category: "Entertainment",
    emoji: "🎬",
    subInterests: ["Anime", "Movies", "TV Shows", "Books", "Podcasts"],
  },
  {
    key: "music",
    category: "Music",
    emoji: "🎵",
    subInterests: ["K-Pop", "Pop", "Rock", "Hip-Hop", "Classical", "Jazz"],
  },
  {
    key: "gaming",
    category: "Gaming",
    emoji: "🎮",
    subInterests: ["RPG", "Action", "Strategy", "Indie", "Esports"],
  },
  {
    key: "travel",
    category: "Travel",
    emoji: "✈️",
    subInterests: ["Backpacking", "Beaches", "City Trips", "Hiking", "Road Trips"],
  },
  {
    key: "creativity",
    category: "Creativity",
    emoji: "🎨",
    subInterests: ["Photography", "Art", "Writing", "Dance", "Fashion"],
  },
  {
    key: "lifestyle",
    category: "Lifestyle",
    emoji: "🌿",
    subInterests: ["Fitness", "Food", "Cooking", "Nature", "Technology"],
  },
]

