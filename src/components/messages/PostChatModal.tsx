"use client"

import * as React from "react"
import { Loader2, UserPlus } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Partner } from "@/app/(app)/messages/[conversationId]/use-conversation-thread"

/** Relocated out of `[conversationId]/page.tsx` (roadmap #16), unchanged. */
export function PostChatModal({
  partner,
  onAddFriend,
  onDismiss,
}: {
  partner: Partner
  onAddFriend: () => Promise<void>
  onDismiss: () => void
}) {
  const [addBusy, setAddBusy] = React.useState(false)
  const [added, setAdded] = React.useState(false)

  async function handleAdd() {
    setAddBusy(true)
    await onAddFriend()
    setAdded(true)
    setAddBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl">
        <p className="text-2xl">👋</p>
        <h2 className="mt-2 text-lg font-semibold">Great conversation!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Would you like to stay in touch with {partner.name}?
        </p>

        <Avatar className="mx-auto mt-4 size-16">
          <AvatarFallback
            className={`bg-gradient-to-br ${partner.avatarColor} text-lg font-semibold text-white`}
          >
            {partner.avatarInitials}
          </AvatarFallback>
        </Avatar>
        <p className="mt-2 font-medium">{partner.name}</p>
        {partner.country && (
          <p className="text-xs text-muted-foreground">{partner.country}</p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {added ? (
            <Button variant="secondary" className="w-full" disabled>
              Friend request sent!
            </Button>
          ) : (
            <Button className="w-full" onClick={handleAdd} disabled={addBusy}>
              {addBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Add Friend
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onDismiss}
          >
            Not Now
          </Button>
        </div>
      </div>
    </div>
  )
}
