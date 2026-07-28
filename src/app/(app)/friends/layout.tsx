import type { Metadata } from "next"

// The page in this segment is a Client Component and cannot export
// metadata, so the title lives here.
export const metadata: Metadata = { title: "Friends" }

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return children
}
