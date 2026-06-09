"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Inbox, MessageSquare, Video } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types"

interface ConversationListProps {
  conversations: Conversation[]
}

export function ConversationList({ conversations }: ConversationListProps) {
  const pathname = usePathname()

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Inbox className="size-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No conversations yet</p>
        <p className="text-xs text-muted-foreground">
          Start a Chat Match or Video Match to begin
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => {
        const href = `/session/chat/${conv.id}`
        const active = pathname.includes(conv.id)
        return (
          <Link
            key={conv.id}
            href={href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent",
              active && "bg-accent"
            )}
          >
            <div className="relative">
              <Avatar>
                <AvatarFallback className={`bg-gradient-to-br ${conv.partner.avatarColor} text-white`}>
                  {conv.partner.avatarInitials}
                </AvatarFallback>
              </Avatar>
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-background",
                conv.type === "video" ? "bg-violet-500" : "bg-blue-500"
              )}>
                {conv.type === "video"
                  ? <Video className="size-2.5 text-white" />
                  : <MessageSquare className="size-2.5 text-white" />
                }
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium">
                  {conv.partner.name} {conv.partner.flag}
                </p>
                {conv.unreadCount > 0 && (
                  <span className="ml-2 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              {conv.lastMessage && (
                <p className="truncate text-xs text-muted-foreground">
                  {conv.lastMessage.content}
                </p>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
