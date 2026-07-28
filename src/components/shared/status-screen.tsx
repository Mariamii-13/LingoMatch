import Link from "next/link"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type Action =
  | { kind: "link"; href: string; label: string }
  | { kind: "button"; onClick: () => void; label: string }

/**
 * Shared layout for the app's dead ends — not found, crashed, offline.
 *
 * These screens are the ones users meet on their worst visit, and they were the
 * only surfaces still rendering Next's unstyled defaults. Routing them through
 * one component keeps a 404 and a crash recognisably part of the same product,
 * and guarantees each one offers a way back out.
 */
export function StatusScreen({
  icon: Icon,
  code,
  title,
  description,
  actions,
  detail,
}: {
  icon: LucideIcon
  code?: string
  title: string
  description: string
  actions: Action[]
  detail?: string
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-7" />
      </span>

      {code && (
        <p className="mt-6 text-sm font-medium tracking-wide text-muted-foreground">{code}</p>
      )}

      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {actions.map((action, index) => {
          // Only the first action is the recommended way out; the rest are
          // alternatives and should not compete with it visually.
          const variant = index === 0 ? "default" : "outline"

          return action.kind === "link" ? (
            <Button
              key={action.label}
              size="lg"
              variant={variant}
              nativeButton={false}
              render={<Link href={action.href} />}
            >
              {action.label}
            </Button>
          ) : (
            <Button key={action.label} size="lg" variant={variant} onClick={action.onClick}>
              {action.label}
            </Button>
          )
        })}
      </div>

      {detail && (
        <p className="mt-8 max-w-md break-words font-mono text-xs text-muted-foreground/70">
          {detail}
        </p>
      )}
    </div>
  )
}
