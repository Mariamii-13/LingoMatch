# Notifications Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bell-icon notification popover to the navbar showing mock notifications with All/Unread tabs, read/unread states, and inline Accept/Decline on friend requests.

**Architecture:** Mock data in `mock-data.ts` → `useNotifications` hook (in-memory useState) → `NotificationsPopover` component using `@base-ui/react/popover` → dropped into navbar replacing the bare Bell button.

**Tech Stack:** Next.js 16, @base-ui/react/popover, Tailwind CSS, TypeScript

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/lib/mock-data.ts` | Add `NotificationType`, `Notification` type, `notifications` array |
| Create | `src/hooks/use-notifications.ts` | In-memory state hook — list, unreadCount, markRead, markAllRead |
| Create | `src/components/shared/notifications-popover.tsx` | Full popover UI — tabs, items, Accept/Decline |
| Modify | `src/components/shared/navbar.tsx` | Replace bare Bell with `<NotificationsPopover />` |

---

## Task 1: Add notification types and mock data to `src/lib/mock-data.ts`

**Files:**
- Modify: `src/lib/mock-data.ts`

- [ ] **Step 1: Append the type definitions and mock array at the end of the file**

Add after the last export in `src/lib/mock-data.ts`:

```ts
export type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "session_reminder"
  | "streak"
  | "match"

export interface Notification {
  id: string
  type: NotificationType
  read: boolean
  timestamp: string
  message: string
  actor?: {
    name: string
    initials: string
    avatarColor: string
  }
}

export const notifications: Notification[] = [
  {
    id: "notif-1",
    type: "friend_request",
    read: false,
    timestamp: "2 min ago",
    message: "sent you a friend request",
    actor: {
      name: "Kenji M.",
      initials: "KM",
      avatarColor: "from-sky-500 to-blue-600",
    },
  },
  {
    id: "notif-2",
    type: "session_reminder",
    read: false,
    timestamp: "25 min ago",
    message: "Session reminder with Sofia in 30 minutes",
  },
  {
    id: "notif-3",
    type: "streak",
    read: false,
    timestamp: "1 hr ago",
    message: "12-day streak! Keep it going 🔥",
  },
  {
    id: "notif-4",
    type: "friend_accepted",
    read: true,
    timestamp: "Yesterday",
    message: "accepted your friend request",
    actor: {
      name: "Lena M.",
      initials: "LM",
      avatarColor: "from-amber-400 to-red-500",
    },
  },
  {
    id: "notif-5",
    type: "match",
    read: true,
    timestamp: "2 days ago",
    message: "New match available — Japanese speaker nearby",
  },
]
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd "c:/Users/Ggstore/OneDrive/Desktop/LingoMatch" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors relating to `mock-data.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/mock-data.ts
git commit -m "feat: add Notification type and mock notifications data"
```

---

## Task 2: Create `src/hooks/use-notifications.ts`

**Files:**
- Create: `src/hooks/use-notifications.ts`

- [ ] **Step 1: Create the hooks directory and file**

Create `src/hooks/use-notifications.ts` with this exact content:

```ts
"use client"

import { useState } from "react"
import { notifications as initialNotifications, type Notification } from "@/lib/mock-data"

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return { notifications, unreadCount, markRead, markAllRead }
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd "c:/Users/Ggstore/OneDrive/Desktop/LingoMatch" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-notifications.ts
git commit -m "feat: add useNotifications hook"
```

---

## Task 3: Create `src/components/shared/notifications-popover.tsx`

**Files:**
- Create: `src/components/shared/notifications-popover.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/shared/notifications-popover.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd "c:/Users/Ggstore/OneDrive/Desktop/LingoMatch" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/notifications-popover.tsx src/hooks/use-notifications.ts
git commit -m "feat: add NotificationsPopover component"
```

---

## Task 4: Wire `NotificationsPopover` into the navbar

**Files:**
- Modify: `src/components/shared/navbar.tsx`

- [ ] **Step 1: Replace the Bell button in the navbar**

In `src/components/shared/navbar.tsx`, make these two changes:

**1. Replace the Bell import line** — remove `Bell` from the lucide-react import (it's now used inside the popover):

```tsx
import Link from "next/link"
import { LogOut, Settings, User as UserIcon } from "lucide-react"
import { signOut, useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { NotificationsPopover } from "@/components/shared/notifications-popover"
```

**2. Replace the Bell button** — find this block in the `return`:

```tsx
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
        </Button>
```

Replace it with:

```tsx
        <NotificationsPopover />
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd "c:/Users/Ggstore/OneDrive/Desktop/LingoMatch" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Manual smoke test**

Start the dev server (`npm run dev`), open http://localhost:3000, log in, and verify:
- Bell icon shows purple dot (3 unread)
- Clicking bell opens the panel
- All tab shows 5 notifications
- Unread tab shows 3 notifications with badge
- Clicking any item marks it read (purple border + tint disappear)
- "Mark all read" removes dot from bell
- Clicking outside closes the panel

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/navbar.tsx
git commit -m "feat: wire NotificationsPopover into navbar bell icon"
```
