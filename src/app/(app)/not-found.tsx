import { Compass } from "lucide-react"

import { StatusScreen } from "@/components/shared/status-screen"

/**
 * A missing profile or conversation resolves here rather than at the root, so
 * the signed-in user keeps their navigation and can carry on.
 */
export default function AppSectionNotFound() {
  return (
    <StatusScreen
      icon={Compass}
      code="404"
      title="We could not find that"
      description="This page or profile no longer exists, or you may not have access to it."
      actions={[
        { kind: "link", href: "/dashboard", label: "Go to Home" },
        { kind: "link", href: "/explore", label: "Find partners" },
      ]}
    />
  )
}
