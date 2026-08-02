"use client"

import * as React from "react"
import { Check, Copy, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/**
 * Roadmap #33 (§20.3): inviting a real exchange partner solves acquisition
 * and liquidity at the same time — the invitee is connected as a friend
 * immediately on signup (`referral.server.ts`), not dropped into the
 * matching queue's own liquidity problem. Deliberately simple: one link, no
 * referral-program mechanics, no incentive/reward system (18.6 — the
 * evidence for a referral link itself is standard; a rewards layer on top
 * would be new, unproven complexity with no evidence behind it yet).
 *
 * `inviteLink` is computed server-side (see the page) rather than from
 * `window.location.origin` here — no hydration mismatch, and no client-only
 * effect needed just to display a static string.
 */
export function InviteCard({ inviteLink }: { inviteLink: string }) {
  const [copied, setCopied] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can fail (permissions, insecure context); the link
      // is still visible and selectable in the input, so nothing is lost.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="size-5 text-primary" aria-hidden="true" />
          Invite a partner
        </CardTitle>
        <CardDescription>
          Know someone learning your language, or who speaks the one you&apos;re learning? Invite
          them directly — you&apos;ll be connected as friends the moment they sign up, no waiting
          on the matching queue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={inviteLink}
            aria-label="Your invite link"
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border bg-muted px-3 py-2 text-sm text-foreground"
          />
          <Button type="button" onClick={handleCopy} className="gap-2 sm:w-32">
            {copied ? (
              <>
                <Check className="size-4" aria-hidden="true" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-4" aria-hidden="true" /> Copy link
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
