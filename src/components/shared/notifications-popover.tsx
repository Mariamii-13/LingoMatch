"use client"

import { useState } from "react"
import { Popover } from "@base-ui/react/popover"
import { Bell, Calendar, Flame, MessageCircle, UserCheck, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/hooks/use-notifications"
import type { Notification, NotificationType } from "@/lib/mock-data"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  friend_request: <UserPlus className="size-4" />,
  friend_accepted: <UserCheck className="size-4" />,
  session_reminder: <Calendar className="size-4" />,
  streak: <Flame className="size-4" />,
  match: <MessageCircle className="size-4" />,
}

const TYPE_COLOR: Record<NotificationType, string> = {
  friend_request: "from-violet-500 to-purple-600",
  friend_accepted: "from-amber-400 to-red-500",
  session_reminder: "from-pink-500 to-rose-500",
  streak: "from-sky-500 to-indigo-500",
  match: "from-emerald-500 to-teal-500",
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string) => void
}) {
  const { id, type, read, timestamp, message, actor } = notification

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent border-l-[3px]",
        read
          ? "border-transparent"
          : "border-primary bg-primary/5"
      )}
      onClick={() => onRead(id)}
    >
      {/* Avatar */}
      <Avatar className="size-9 shrink-0">
        <AvatarFallback
          className={cn(
            "bg-gradient-to-br text-white text-xs font-bold",
            actor ? actor.avatarColor : TYPE_COLOR[type]
          )}
        >
          {actor ? actor.initials : TYPE_ICON[type]}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug text-foreground">
          {actor && <span className="font-semibold">{actor.name} </span>}
          {message}
        </p>

        {/* Inline actions for unread friend requests */}
        {type === "friend_request" && !read && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onRead(id)
              }}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onRead(id)
              }}
            >
              Decline
            </Button>
          </div>
        )}

        <p
          className={cn(
            "text-xs mt-1.5",
            read ? "text-muted-foreground" : "text-primary font-medium"
          )}
        >
          {timestamp}
        </p>
      </div>

      {/* Unread dot */}
      {!read && (
        <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
      )}
    </div>
  )
}

export function NotificationsPopover() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [tab, setTab] = useState<"all" | "unread">("all")

  const visible = tab === "unread" ? notifications.filter((n) => !n.read) : notifications

  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            className="relative"
          />
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary border-2 border-background" />
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8}>
          <Popover.Popup className="z-50 w-80 rounded-xl border bg-popover shadow-lg outline-none data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95 data-[starting-style]:animate-in data-[starting-style]:fade-in-0 data-[starting-style]:zoom-in-95">

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-0">
              <span className="font-bold text-base">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-0 px-4 pt-3 border-b border-border">
              <button
                onClick={() => setTab("all")}
                className={cn(
                  "pb-2 px-3 text-sm font-medium border-b-2 transition-colors",
                  tab === "all"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setTab("unread")}
                className={cn(
                  "pb-2 px-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5",
                  tab === "unread"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Unread
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full text-[11px] px-1.5 py-px leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Notification list */}
            <div className="max-h-[340px] overflow-y-auto">
              {visible.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  All caught up!
                </p>
              ) : (
                visible.map((n) => (
                  <NotificationItem key={n.id} notification={n} onRead={markRead} />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2.5 text-center">
              <button className="text-sm text-primary font-medium hover:underline">
                See all notifications →
              </button>
            </div>

          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
