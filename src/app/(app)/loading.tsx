import { Loader2 } from "lucide-react"

/**
 * Shown while a signed-in page streams in. The (app) layout renders around it,
 * so navigation stays visible and clickable instead of the whole shell blanking
 * out — several of these pages wait on a database round trip.
 */
export default function AppSectionLoading() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading</span>
    </div>
  )
}
