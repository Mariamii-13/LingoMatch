import type { Metadata } from "next"

// The page in this segment is a Client Component and cannot export
// metadata, so the title lives here.
export const metadata: Metadata = { title: "Create your account" }

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
