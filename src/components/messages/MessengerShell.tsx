"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Inbox, MessageSquare, Search, Video, WifiOff } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  RealtimeMessagesProvider,
  useRealtimeMessages,
} from "@/components/messages/RealtimeMessagesProvider"
import { cn } from "@/lib/utils"
import { applyMessageToConversations } from "@/lib/messages/reconcile"
import type { Conversation } from "@/types"

interface Props {
  conversations: Conversation[]
  children: React.ReactNode
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" })
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

export function MessengerShell({ conversations, children }: Props) {
  return (
    <RealtimeMessagesProvider>
      <MessengerShellContent conversations={conversations}>{children}</MessengerShellContent>
    </RealtimeMessagesProvider>
  )
}

function MessengerShellContent({ conversations, children }: Props) {
  const pathname = usePathname()
  const [search, setSearch] = React.useState("")
  const [conversationItems, setConversationItems] = React.useState(conversations)
  const { status, reconnect, subscribe } = useRealtimeMessages()

  React.useEffect(
    () =>
      subscribe((event) => {
        setConversationItems((current) => {
          if (current.some((conversation) => conversation.id === event.conversationId)) {
            return applyMessageToConversations(current, event.message)
          }

          fetch("/api/conversations", { cache: "no-store" })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => {
              if (data?.conversations) setConversationItems(data.conversations)
            })
            .catch(() => {})
          return current
        })
      }),
    [subscribe]
  )

  const activeId = pathname.startsWith("/messages/")
    ? pathname.slice("/messages/".length).split("/")[0]
    : null

  const isOnChat = !!activeId

  const filtered = conversationItems.filter((c) =>
    c.partner.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border bg-card shadow-sm lg:h-[calc(100vh-6rem)]">
      {/* Left panel — conversation list */}
      <div
        className={cn(
          "flex w-full shrink-0 flex-col border-r sm:w-80",
          isOnChat ? "hidden sm:flex" : "flex"
        )}
      >
        {/* Header */}
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Conversations</h2>
            {status === "reconnecting" && (
              <span className="text-xs text-amber-600">Reconnecting…</span>
            )}
            {status === "disconnected" && (
              <Button variant="ghost" size="xs" onClick={reconnect}>
                <WifiOff className="size-3.5" /> Reconnect
              </Button>
            )}
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-full border border-input bg-muted py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <Inbox className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search ? "No results" : "No conversations yet"}
              </p>
            </div>
          ) : (
            filtered.map((conv) => {
              const active = activeId === conv.id
              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent",
                    active && "bg-accent"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-11">
                      {conv.partner.avatar && (
                        <AvatarImage src={conv.partner.avatar} alt={conv.partner.name} />
                      )}
                      <AvatarFallback
                        className={`bg-gradient-to-br ${conv.partner.avatarColor} text-sm font-semibold text-white`}
                      >
                        {conv.partner.avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-card",
                        conv.type === "video" ? "bg-violet-500" : "bg-blue-500"
                      )}
                    >
                      {conv.type === "video" ? (
                        <Video className="size-2.5 text-white" />
                      ) : (
                        <MessageSquare className="size-2.5 text-white" />
                      )}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={cn(
                          "truncate text-sm",
                          conv.unreadCount > 0 ? "font-bold" : "font-semibold"
                        )}
                      >
                        {conv.partner.name}
                      </p>
                      {conv.lastMessage && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={cn(
                          "truncate text-xs",
                          conv.unreadCount > 0
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {conv.lastMessage?.content ?? "No messages yet"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>

      {/* Right panel */}
      <div
        className={cn(
          "min-w-0 flex-1 flex-col",
          isOnChat ? "flex" : "hidden sm:flex"
        )}
      >
        {children}
      </div>
    </div>
  )
}
