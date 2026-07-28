import type { Metadata } from "next"

// The page in this segment is a Client Component and cannot export
// metadata, so the title lives here.
export const metadata: Metadata = { title: "Settings" }

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children
}
