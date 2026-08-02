import Link from "next/link"
import { ArrowRight, MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { MatchResult } from "@/types"

/**
 * Roadmap #32: surfaces a match that formed while the user was offline
 * (they'd declared an availability window instead of queueing live). Server
 * component — `getPendingMatches` already marked these rows seen by the
 * time this renders, so refreshing the dashboard won't repeat them.
 */
export function PendingMatchCard({ matches }: { matches: MatchResult[] }) {
  if (matches.length === 0) return null

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <article
          key={match.conversationId}
          className="flex flex-col gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <Avatar className="size-12">
              <AvatarFallback className={`bg-gradient-to-br ${match.partner.avatarColor} font-semibold text-white`}>
                {match.partner.avatarInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Partner found while you were away
              </p>
              <h3 className="mt-0.5 text-base font-semibold">
                {match.partner.name} wants to practise with you
              </h3>
              <p className="text-sm text-muted-foreground">
                {match.compatibilityPct}% match · text conversation
              </p>
            </div>
          </div>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            nativeButton={false}
            render={<Link href={`/messages/${match.conversationId}`} />}
          >
            <MessageSquare className="size-4" /> Open conversation <ArrowRight className="size-4" />
          </Button>
        </article>
      ))}
    </div>
  )
}
