import type { Metadata } from "next"

// The page in this segment is a Client Component and cannot export
// metadata, so the title lives here.
export const metadata: Metadata = { title: "Password reset" }

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
