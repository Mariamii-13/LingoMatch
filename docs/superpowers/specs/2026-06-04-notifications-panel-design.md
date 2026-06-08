# Notifications Panel Design

**Date:** 2026-06-04
**Status:** Approved

## Overview

Bell icon in the navbar opens a popover panel showing in-app notifications. All-mock data, no backend. Uses `@base-ui/react/popover` consistent with existing UI patterns.

## Visual Design

- **Style:** Compact dropdown anchored under the bell (Option A base)
- **Unread items:** Purple left border (`border-l-[3px] border-primary`) + tinted background (`bg-primary/5`) + purple dot indicator
- **Read items:** Plain white, no border, muted timestamp
- **Friend requests:** Inline Accept / Decline buttons (unread only)
- **Header:** "Notifications" title + "Mark all read" link (right-aligned)
- **Tabs:** Underline style — "All" | "Unread (n)" with purple badge
- **Footer:** "See all notifications →" link
- **Bell:** Purple dot indicator when `unreadCount > 0`

## Architecture

### Data — `src/lib/mock-data.ts`

Add `Notification` type and `notifications` array:

```ts
type NotificationType =
  | "friend_request"
  | "friend_accepted"
  | "session_reminder"
  | "streak"
  | "match"

interface Notification {
  id: string
  type: NotificationType
  read: boolean
  timestamp: string
  message: string
  actor?: { name: string; initials: string; avatarColor: string }
}
```

5 mock items covering all types (3 unread, 2 read).

### Hook — `src/hooks/use-notifications.ts`

Client-side hook with `useState` over the mock array:

- `notifications: Notification[]`
- `unreadCount: number`
- `markRead(id: string): void`
- `markAllRead(): void`

Clicking any notification item calls `markRead(id)`. Accept/Decline on friend requests calls `markRead(id)` (action is mock-only).

### Components

**`src/components/shared/notifications-popover.tsx`**
Single file. Contains:
- `NotificationsPopover` — the `Popover.Root` wrapper, exported and dropped into navbar
- `NotificationItem` — renders one row, handles all 5 types
- Internal `TabState` for All / Unread toggle (local `useState`, not the Tabs component — simpler for a 2-tab toggle)

### Navbar change — `src/components/shared/navbar.tsx`

Replace the bare `<Bell>` button with `<NotificationsPopover />`. No other changes.

## Data Flow

```
mock-data.ts → useNotifications hook → NotificationsPopover
                      ↑ markRead / markAllRead (state mutation, in-memory only)
```

## Error Handling

Mock-only — no async, no error states needed.

## Testing

Manual: open panel, switch tabs, click "Mark all read", verify dot disappears. No automated tests (mock data only).
