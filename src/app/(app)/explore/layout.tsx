import type { Metadata } from "next"

// The page in this segment is a Client Component and cannot export
// metadata, so the title lives here.
export const metadata: Metadata = { title: "Find partners" }

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children
}
