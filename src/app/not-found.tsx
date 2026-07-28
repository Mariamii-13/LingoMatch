import type { Metadata } from "next"
import { Compass } from "lucide-react"

import { StatusScreen } from "@/components/shared/status-screen"

// The root layout's title template appends "· LingoMatch", so this must not.
export const metadata: Metadata = {
  title: "Page not found",
}

export default function NotFound() {
  return (
    <StatusScreen
      icon={Compass}
      code="404"
      title="We could not find that page"
      description="The link may be out of date, or the page may have moved. Your practice and profile are unaffected."
      actions={[
        { kind: "link", href: "/dashboard", label: "Go to Home" },
        { kind: "link", href: "/ai-practice", label: "Start practising" },
      ]}
    />
  )
}
