# LingoMatch Chat & Video Match Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Voice Match with Chat Match (text + SSE) and Video Match (LiveKit WebRTC), update navigation and dashboard, add persistent messaging.

**Architecture:** Two match flows share MatchConfigForm/SearchingState/MatchFoundModal. After match, chat sessions use poll-based MongoDB messaging; video sessions use LiveKit rooms with data channel + MongoDB persistence. Matching uses a TTL-indexed MongoDB queue with atomic `findOneAndUpdate`.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Mongoose 9, LiveKit (`livekit-client` + `@livekit/components-react` + `livekit-server-sdk`), Tailwind CSS v4, shadcn/ui

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| CREATE | `src/lib/models/Conversation.ts` | Mongoose model — session between two users |
| CREATE | `src/lib/models/Message.ts` | Mongoose model — persisted chat message |
| CREATE | `src/lib/models/MatchRequest.ts` | Mongoose model — TTL match queue entry |
| MODIFY | `src/lib/models/User.ts` | Add `friends` + `friendRequests` fields |
| MODIFY | `src/types/index.ts` | Add `Message`, `Conversation`, `MatchResult`, `MatchPhase` types; update `Session`/`ScheduledSession` |
| MODIFY | `src/lib/mock-data.ts` | Add `type: 'chat'\|'video'` to sessions; update pricing copy |
| MODIFY | `src/components/shared/sidebar.tsx` | Split "Find Match" → "Chat Match" + "Video Match"; logo `Mic` → `Languages` |
| MODIFY | `src/components/shared/mobile-nav.tsx` | "Match" → `/match` |
| MODIFY | `src/app/(app)/dashboard/page.tsx` | Replace single CTA → dual Chat/Video buttons |
| CREATE | `src/app/api/match/chat/route.ts` | POST: enter chat queue / GET: poll by requestId |
| CREATE | `src/app/api/match/video/route.ts` | POST: enter video queue / GET: poll by requestId |
| CREATE | `src/app/api/session/[id]/messages/route.ts` | GET: paginated history; POST: save message |
| CREATE | `src/app/api/session/[id]/token/route.ts` | GET: LiveKit JWT for room |
| CREATE | `src/app/api/session/[id]/end/route.ts` | POST: mark ended, record duration |
| CREATE | `src/app/api/conversations/route.ts` | GET: user's conversation list |
| CREATE | `src/app/api/friends/request/route.ts` | POST: send friend request |
| CREATE | `src/app/api/friends/[id]/accept/route.ts` | POST: accept friend request |
| CREATE | `src/components/match/MatchConfigForm.tsx` | Language + interest selector (shared) |
| CREATE | `src/components/match/SearchingState.tsx` | Animated searching UI + cancel |
| CREATE | `src/components/match/MatchFoundModal.tsx` | Partner profile overlay + action buttons |
| CREATE | `src/components/session/PreJoinScreen.tsx` | Camera preview + cam/mic toggles |
| CREATE | `src/components/session/ChatSession.tsx` | Full-screen chat: messages + input + header |
| CREATE | `src/components/session/SessionControls.tsx` | Bottom control bar (cam/mic/chat/end) |
| CREATE | `src/components/session/ChatPanel.tsx` | Slide-in chat panel for video session |
| CREATE | `src/components/session/VideoSession.tsx` | LiveKit room wrapper + custom UI |
| CREATE | `src/components/messages/ConversationList.tsx` | Left panel: conversations with unread badges |
| REPLACE | `src/app/(app)/match/page.tsx` | Mode picker (Chat / Video cards) |
| CREATE | `src/app/(app)/match/chat/page.tsx` | Chat Match config → searching → found modal |
| CREATE | `src/app/(app)/match/video/page.tsx` | Video Match config → pre-join → searching → found |
| CREATE | `src/app/(app)/messages/page.tsx` | Chat inbox |
| CREATE | `src/app/session/chat/[id]/page.tsx` | Full-screen chat session (no sidebar) |
| CREATE | `src/app/session/video/[id]/page.tsx` | Full-screen video session (no sidebar) |
| DELETE | `src/app/session/[id]/page.tsx` | Replaced by type-split routes |

---

## Task 1: Read Next.js 16 docs + install LiveKit

**Files:** none (setup only)

- [ ] Read Next.js 16 route handler docs before touching any API routes:

```bash
cat "node_modules/next/dist/docs/02-app/01-routing/12-route-handlers.md" 2>/dev/null || echo "check node_modules/next/dist/docs/"
```

- [ ] Install LiveKit packages:

```bash
npm install livekit-client @livekit/components-react livekit-server-sdk
```

Expected: packages added to `node_modules/`, `package.json` updated.

- [ ] Add LiveKit env vars to `.env.local` (get keys from https://cloud.livekit.io):

```bash
# append to .env.local
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

- [ ] Verify install compiles:

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds (or only pre-existing errors).

- [ ] Commit:

```bash
git add package.json package-lock.json
git commit -m "chore: install livekit-client, @livekit/components-react, livekit-server-sdk"
```

---

## Task 2: Mongoose models — Conversation, Message, MatchRequest

**Files:**
- Create: `src/lib/models/Conversation.ts`
- Create: `src/lib/models/Message.ts`
- Create: `src/lib/models/MatchRequest.ts`

- [ ] Create `src/lib/models/Conversation.ts`:

```typescript
import mongoose, { Schema } from 'mongoose'

const ConversationSchema = new Schema(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: true,
      validate: (v: unknown[]) => v.length === 2,
    },
    type: { type: String, enum: ['chat', 'video'], required: true },
    language: { type: String, required: true },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    livekitRoomName: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null },
  },
  { timestamps: true }
)

export default mongoose.models.Conversation ||
  mongoose.model('Conversation', ConversationSchema)
```

- [ ] Create `src/lib/models/Message.ts`:

```typescript
import mongoose, { Schema } from 'mongoose'

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: { type: String, required: true, maxlength: 2000 },
  },
  { timestamps: true }
)

MessageSchema.index({ conversationId: 1, createdAt: 1 })

export default mongoose.models.Message ||
  mongoose.model('Message', MessageSchema)
```

- [ ] Create `src/lib/models/MatchRequest.ts`:

```typescript
import mongoose, { Schema } from 'mongoose'

const MatchRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['chat', 'video'], required: true },
    targetLanguage: { type: String, required: true },
    nativeLanguage: { type: String, required: true },
    interests: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['waiting', 'matched', 'cancelled'],
      default: 'waiting',
    },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
    createdAt: { type: Date, default: Date.now, expires: 60 }, // TTL: auto-delete after 60s
  }
)

export default mongoose.models.MatchRequest ||
  mongoose.model('MatchRequest', MatchRequestSchema)
```

- [ ] Commit:

```bash
git add src/lib/models/Conversation.ts src/lib/models/Message.ts src/lib/models/MatchRequest.ts
git commit -m "feat: add Conversation, Message, MatchRequest mongoose models"
```

---

## Task 3: Update User model + TypeScript types

**Files:**
- Modify: `src/lib/models/User.ts`
- Modify: `src/types/index.ts`

- [ ] Add `friends` and `friendRequests` to `src/lib/models/User.ts`. Find the closing brace of the schema fields (before `{ timestamps: true }`) and add:

```typescript
    friends: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    friendRequests: {
      type: [
        {
          from: { type: Schema.Types.ObjectId, ref: 'User' },
          createdAt: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      default: [],
    },
```

- [ ] Add new types to `src/types/index.ts`. Append after the last `export`:

```typescript
// Session type discriminator
// (also add `type` field to existing Session and ScheduledSession interfaces above)

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderInitials: string
  senderAvatarColor: string
  content: string
  createdAt: string
}

export interface Conversation {
  id: string
  type: 'chat' | 'video'
  partner: Pick<User, 'id' | 'name' | 'username' | 'flag' | 'avatarInitials' | 'avatarColor'>
  language: string
  status: 'active' | 'ended'
  lastMessage?: Pick<Message, 'content' | 'createdAt'>
  unreadCount: number
  startedAt: string
}

export type MatchPhase = 'idle' | 'configuring' | 'prejoin' | 'searching' | 'found'

export interface MatchResult {
  conversationId: string
  partner: Pick<
    User,
    'id' | 'name' | 'username' | 'country' | 'flag' | 'avatarInitials' | 'avatarColor' | 'native' | 'learning' | 'interests'
  >
  compatibilityPct: number
}
```

- [ ] In `src/types/index.ts`, add `type: 'chat' | 'video'` to the **existing** `Session` and `ScheduledSession` interfaces:

```typescript
export interface Session {
  id: string
  partner: Pick<User, 'id' | 'name' | 'username' | 'flag' | 'avatarInitials' | 'avatarColor'>
  type: 'chat' | 'video'   // ← add this
  mode: string
  language: string
  date: string
  durationMinutes: number
  rating?: number
}

export interface ScheduledSession {
  id: string
  partner: Pick<User, 'id' | 'name' | 'username' | 'flag' | 'avatarInitials' | 'avatarColor'>
  type: 'chat' | 'video'   // ← add this
  mode: string
  language: string
  date: string
  time: string
  timezone: string
}
```

- [ ] Commit:

```bash
git add src/lib/models/User.ts src/types/index.ts
git commit -m "feat: add friends/friendRequests to User model; add Message, Conversation, MatchResult types"
```

---

## Task 4: Update mock data + sidebar + mobile nav + dashboard

**Files:**
- Modify: `src/lib/mock-data.ts`
- Modify: `src/components/shared/sidebar.tsx`
- Modify: `src/components/shared/mobile-nav.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] In `src/lib/mock-data.ts`, add `type` to each entry in `mockSessions` (all three are `'video'` for variety) and `scheduledSessions`:

```typescript
// mockSessions — add type field to each object
{ id: "s1", type: "video", partner: {...}, mode: "Deep Conversations", ... }
{ id: "s2", type: "chat",  partner: {...}, mode: "Study Together", ... }
{ id: "s3", type: "video", partner: {...}, mode: "Cultural Exchange", ... }

// scheduledSessions — add type field
{ id: "sch1", type: "video", partner: {...}, ... }
{ id: "sch2", type: "chat",  partner: {...}, ... }
{ id: "sch3", type: "video", partner: {...}, ... }
```

- [ ] In `src/lib/mock-data.ts`, update `pricing.free.features` — replace `"Voice-only matching"` with `"Chat matching (text)"`:

```typescript
features: [
  "3 conversations per day",
  "Chat matching (text)",
  "Basic AI matching",
  "Friendly & Casual modes",
  "Add up to 10 friends",
],
```

- [ ] Replace the full `src/components/shared/sidebar.tsx` content:

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Calendar,
  Languages,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Settings,
  Users,
  Video,
  Inbox,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type NavItem = { label: string; href: string; icon: LucideIcon }

const mainNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
]

const matchNav: NavItem[] = [
  { label: "Chat Match", href: "/match/chat", icon: MessageSquare },
  { label: "Video Match", href: "/match/video", icon: Video },
]

const socialNav: NavItem[] = [
  { label: "Messages", href: "/messages", icon: Inbox },
  { label: "Friends", href: "/friends", icon: Users },
  { label: "Schedule", href: "/schedule", icon: Calendar },
]

const bottomNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
]

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/")
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="hidden lg:inline">{item.label}</span>
    </Link>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="hidden px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground lg:block">
      {label}
    </p>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const name = session?.user?.name ?? "User"
  const username = (session?.user as { username?: string })?.username ?? "me"
  const plan = (session?.user as { plan?: string })?.plan ?? "free"
  const image = session?.user?.image ?? ""
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r bg-sidebar lg:flex lg:w-64">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Languages className="size-4" />
        </span>
        <span className="hidden text-base font-semibold lg:inline">LingoMatch</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 lg:p-3">
        {mainNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
        <SectionLabel label="Match" />
        {matchNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
        <SectionLabel label="Social" />
        {socialNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
        <SectionLabel label="Account" />
        {bottomNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
      </nav>

      <div className="border-t p-2 lg:p-3">
        <Link
          href={`/profile/${username}`}
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
        >
          <Avatar>
            {image ? <AvatarImage src={image} alt={name} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm font-medium">{name}</p>
            <Badge variant={plan === "premium" ? "default" : "secondary"} className="mt-0.5 capitalize">
              {plan}
            </Badge>
          </div>
        </Link>
      </div>
    </aside>
  )
}
```

- [ ] Replace `src/components/shared/mobile-nav.tsx`:

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Inbox, LayoutDashboard, MessageSquare, Users, Video } from "lucide-react"

import { cn } from "@/lib/utils"

const items = [
  { label: "Home",     href: "/dashboard",  icon: LayoutDashboard },
  { label: "Chat",     href: "/match/chat", icon: MessageSquare },
  { label: "Video",    href: "/match/video",icon: Video },
  { label: "Messages", href: "/messages",   icon: Inbox },
  { label: "Friends",  href: "/friends",    icon: Users },
]

export function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t bg-background/90 backdrop-blur-md lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] Replace the CTA section in `src/app/(app)/dashboard/page.tsx`. Find this block:

```tsx
      {/* Find a Conversation CTA */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 text-white shadow-lg">
        <span className="text-lg font-bold">Find a Conversation</span>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 bg-white text-violet-700 hover:bg-white/90 font-semibold"
          render={<Link href="/match" />}
        >
          Find Now →
        </Button>
      </div>
```

Replace with:

```tsx
      {/* Match CTAs */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">Start a conversation</p>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/match/chat"
            className="flex flex-col items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-5 text-white transition-colors hover:bg-blue-700"
          >
            <MessageSquare className="size-6" />
            <span className="text-sm font-semibold">Chat Match</span>
            <span className="text-xs opacity-75">Text · Instant</span>
          </Link>
          <Link
            href="/match/video"
            className="flex flex-col items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-5 text-white transition-colors hover:bg-violet-700"
          >
            <Video className="size-6" />
            <span className="text-sm font-semibold">Video Match</span>
            <span className="text-xs opacity-75">Video · Voice · Chat</span>
          </Link>
        </div>
      </div>
```

- [ ] Add missing imports to dashboard page (`MessageSquare`, `Video`, `Link`). The file already imports `Link` from `"next/link"`. Add to the lucide-react import line:

```typescript
import { Calendar, MessageSquare, Sparkles, Users, Video } from "lucide-react"
```

- [ ] Run dev server and visually verify dashboard shows two CTA buttons:

```bash
npm run dev
```

Open http://localhost:3000/dashboard. Confirm: two equal buttons (Chat Match blue, Video Match violet), sidebar shows "Chat Match" + "Video Match" nav items, `Languages` icon in logo position.

- [ ] Commit:

```bash
git add src/lib/mock-data.ts src/components/shared/sidebar.tsx src/components/shared/mobile-nav.tsx src/app/(app)/dashboard/page.tsx
git commit -m "feat: split Find Match into Chat Match + Video Match in nav and dashboard"
```

---

## Task 5: Match API — chat queue

**Files:**
- Create: `src/app/api/match/chat/route.ts`

- [ ] Create `src/app/api/match/chat/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import connectDB from "@/lib/db"
import MatchRequest from "@/lib/models/MatchRequest"
import Conversation from "@/lib/models/Conversation"
import User from "@/lib/models/User"

// Deterministic compatibility score seeded by two user IDs
function compatibilityPct(idA: string, idB: string): number {
  const hash = [...(idA + idB)].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return 75 + (hash % 22)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { targetLanguage, nativeLanguage, interests = [] } = await req.json()
  if (!targetLanguage || !nativeLanguage)
    return NextResponse.json({ error: "targetLanguage and nativeLanguage required" }, { status: 400 })

  await connectDB()
  const userId = session.user.id

  // Try to match with a waiting user
  const existing = await MatchRequest.findOneAndUpdate(
    {
      type: "chat",
      targetLanguage: nativeLanguage,   // they want to practice what I speak
      nativeLanguage: targetLanguage,   // they speak what I want to learn
      status: "waiting",
      userId: { $ne: userId },
    },
    { $set: { status: "matched" } },
    { new: true }
  )

  if (existing) {
    const partnerDoc = await User.findById(existing.userId).lean()
    const conv = await Conversation.create({
      participants: [userId, existing.userId],
      type: "chat",
      language: targetLanguage,
      status: "active",
    })
    // Update the matched request with conversationId
    existing.conversationId = conv._id
    await existing.save()

    const partner = partnerDoc as Record<string, unknown>
    const initials = ((partner.displayName as string) ?? "?")
      .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

    return NextResponse.json({
      matched: true,
      conversationId: conv._id.toString(),
      partner: {
        id: (partner._id as object).toString(),
        name: partner.displayName,
        username: partner.username,
        country: partner.country,
        flag: "",
        avatarInitials: initials,
        avatarColor: "from-violet-500 to-indigo-500",
        native: partner.nativeLanguages,
        learning: partner.learningLanguages,
        interests: [],
      },
      compatibilityPct: compatibilityPct(userId, existing.userId.toString()),
    })
  }

  // No match — add to queue
  const request = await MatchRequest.create({
    userId,
    type: "chat",
    targetLanguage,
    nativeLanguage,
    interests,
    status: "waiting",
  })

  return NextResponse.json({ matched: false, requestId: request._id.toString() })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const requestId = req.nextUrl.searchParams.get("requestId")
  if (!requestId) return NextResponse.json({ error: "requestId required" }, { status: 400 })

  await connectDB()

  const request = await MatchRequest.findById(requestId).lean() as Record<string, unknown> | null
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (request.status !== "matched") return NextResponse.json({ matched: false })

  const conv = await Conversation.findById(request.conversationId).lean() as Record<string, unknown>
  const participants = conv.participants as string[]
  const partnerId = participants.find((p) => p.toString() !== session.user!.id)
  const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown>

  const initials = ((partnerDoc.displayName as string) ?? "?")
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  return NextResponse.json({
    matched: true,
    conversationId: (request.conversationId as object).toString(),
    partner: {
      id: (partnerDoc._id as object).toString(),
      name: partnerDoc.displayName,
      username: partnerDoc.username,
      country: partnerDoc.country,
      flag: "",
      avatarInitials: initials,
      avatarColor: "from-violet-500 to-indigo-500",
      native: partnerDoc.nativeLanguages,
      learning: partnerDoc.learningLanguages,
      interests: [],
    },
    compatibilityPct: compatibilityPct(session.user.id, partnerId?.toString() ?? ""),
  })
}
```

- [ ] Commit:

```bash
git add src/app/api/match/chat/route.ts
git commit -m "feat: chat match queue API (POST enter queue, GET poll)"
```

---

## Task 6: Match API — video queue

**Files:**
- Create: `src/app/api/match/video/route.ts`

- [ ] Create `src/app/api/match/video/route.ts` (same logic as chat but type = "video" and creates LiveKit room name):

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import connectDB from "@/lib/db"
import MatchRequest from "@/lib/models/MatchRequest"
import Conversation from "@/lib/models/Conversation"
import User from "@/lib/models/User"

function compatibilityPct(idA: string, idB: string): number {
  const hash = [...(idA + idB)].reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return 75 + (hash % 22)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { targetLanguage, nativeLanguage, interests = [] } = await req.json()
  if (!targetLanguage || !nativeLanguage)
    return NextResponse.json({ error: "targetLanguage and nativeLanguage required" }, { status: 400 })

  await connectDB()
  const userId = session.user.id

  const existing = await MatchRequest.findOneAndUpdate(
    {
      type: "video",
      targetLanguage: nativeLanguage,
      nativeLanguage: targetLanguage,
      status: "waiting",
      userId: { $ne: userId },
    },
    { $set: { status: "matched" } },
    { new: true }
  )

  if (existing) {
    const partnerDoc = await User.findById(existing.userId).lean() as Record<string, unknown>
    const conv = await Conversation.create({
      participants: [userId, existing.userId],
      type: "video",
      language: targetLanguage,
      status: "active",
      livekitRoomName: `lm-video-placeholder`, // updated after save with real _id
    })
    const livekitRoomName = `lm-video-${conv._id.toString()}`
    await Conversation.findByIdAndUpdate(conv._id, { livekitRoomName })

    existing.conversationId = conv._id
    await existing.save()

    const initials = ((partnerDoc.displayName as string) ?? "?")
      .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

    return NextResponse.json({
      matched: true,
      conversationId: conv._id.toString(),
      partner: {
        id: (partnerDoc._id as object).toString(),
        name: partnerDoc.displayName,
        username: partnerDoc.username,
        country: partnerDoc.country,
        flag: "",
        avatarInitials: initials,
        avatarColor: "from-violet-500 to-indigo-500",
        native: partnerDoc.nativeLanguages,
        learning: partnerDoc.learningLanguages,
        interests: [],
      },
      compatibilityPct: compatibilityPct(userId, existing.userId.toString()),
    })
  }

  const request = await MatchRequest.create({
    userId,
    type: "video",
    targetLanguage,
    nativeLanguage,
    interests,
    status: "waiting",
  })

  return NextResponse.json({ matched: false, requestId: request._id.toString() })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const requestId = req.nextUrl.searchParams.get("requestId")
  if (!requestId) return NextResponse.json({ error: "requestId required" }, { status: 400 })

  await connectDB()

  const request = await MatchRequest.findById(requestId).lean() as Record<string, unknown> | null
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (request.status !== "matched") return NextResponse.json({ matched: false })

  const conv = await Conversation.findById(request.conversationId).lean() as Record<string, unknown>
  const participants = conv.participants as string[]
  const partnerId = participants.find((p) => p.toString() !== session.user!.id)
  const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown>

  const initials = ((partnerDoc.displayName as string) ?? "?")
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  return NextResponse.json({
    matched: true,
    conversationId: (request.conversationId as object).toString(),
    partner: {
      id: (partnerDoc._id as object).toString(),
      name: partnerDoc.displayName,
      username: partnerDoc.username,
      country: partnerDoc.country,
      flag: "",
      avatarInitials: initials,
      avatarColor: "from-violet-500 to-indigo-500",
      native: partnerDoc.nativeLanguages,
      learning: partnerDoc.learningLanguages,
      interests: [],
    },
    compatibilityPct: compatibilityPct(session.user.id, partnerId?.toString() ?? ""),
  })
}
```

- [ ] Commit:

```bash
git add src/app/api/match/video/route.ts
git commit -m "feat: video match queue API (POST enter queue, GET poll)"
```

---

## Task 7: Session messages + end APIs

**Files:**
- Create: `src/app/api/session/[id]/messages/route.ts`
- Create: `src/app/api/session/[id]/end/route.ts`

- [ ] Create `src/app/api/session/[id]/messages/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import connectDB from "@/lib/db"
import MessageModel from "@/lib/models/Message"
import Conversation from "@/lib/models/Conversation"
import User from "@/lib/models/User"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const { id } = await params

  const messages = await MessageModel.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .lean()

  const senderIds = [...new Set(messages.map((m) => m.senderId.toString()))]
  const users = await User.find({ _id: { $in: senderIds } }).lean() as Record<string, unknown>[]
  const userMap = Object.fromEntries(users.map((u) => [(u._id as object).toString(), u]))

  const shaped = messages.map((m) => {
    const sender = userMap[m.senderId.toString()] ?? {}
    const name = (sender.displayName as string) ?? "Unknown"
    return {
      id: m._id.toString(),
      conversationId: id,
      senderId: m.senderId.toString(),
      senderName: name,
      senderInitials: name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
      senderAvatarColor: "from-violet-500 to-indigo-500",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }
  })

  return NextResponse.json({ messages: shaped })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 })

  await connectDB()
  const { id } = await params

  const conv = await Conversation.findById(id)
  if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })

  const participantIds = conv.participants.map((p: { toString(): string }) => p.toString())
  if (!participantIds.includes(session.user.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const msg = await MessageModel.create({
    conversationId: id,
    senderId: session.user.id,
    content: content.trim(),
  })

  return NextResponse.json({ message: { id: msg._id.toString(), content: msg.content, createdAt: msg.createdAt } })
}
```

- [ ] Create `src/app/api/session/[id]/end/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import connectDB from "@/lib/db"
import Conversation from "@/lib/models/Conversation"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const { id } = await params

  const conv = await Conversation.findById(id)
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const participantIds = conv.participants.map((p: { toString(): string }) => p.toString())
  if (!participantIds.includes(session.user.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const now = new Date()
  const durationSeconds = Math.round((now.getTime() - conv.startedAt.getTime()) / 1000)

  await Conversation.findByIdAndUpdate(id, {
    status: "ended",
    endedAt: now,
    durationSeconds,
  })

  return NextResponse.json({ ok: true, durationSeconds })
}
```

- [ ] Commit:

```bash
git add src/app/api/session/[id]/messages/route.ts src/app/api/session/[id]/end/route.ts
git commit -m "feat: session messages (GET history, POST send) and end session APIs"
```

---

## Task 8: LiveKit token + conversations + friends APIs

**Files:**
- Create: `src/app/api/session/[id]/token/route.ts`
- Create: `src/app/api/conversations/route.ts`
- Create: `src/app/api/friends/request/route.ts`
- Create: `src/app/api/friends/[id]/accept/route.ts`

- [ ] Create `src/app/api/session/[id]/token/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { AccessToken } from "livekit-server-sdk"
import { auth } from "@/auth"
import connectDB from "@/lib/db"
import Conversation from "@/lib/models/Conversation"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const { id } = await params

  const conv = await Conversation.findById(id)
  if (!conv || conv.type !== "video")
    return NextResponse.json({ error: "Video conversation not found" }, { status: 404 })

  const participantIds = conv.participants.map((p: { toString(): string }) => p.toString())
  if (!participantIds.includes(session.user.id))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const roomName = conv.livekitRoomName ?? `lm-video-${id}`

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: session.user.id, name: session.user.name ?? "User" }
  )
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })

  const token = await at.toJwt()
  return NextResponse.json({ token, roomName, serverUrl: process.env.LIVEKIT_URL })
}
```

- [ ] Create `src/app/api/conversations/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import connectDB from "@/lib/db"
import Conversation from "@/lib/models/Conversation"
import MessageModel from "@/lib/models/Message"
import User from "@/lib/models/User"

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const userId = session.user.id

  const convs = await Conversation.find({ participants: userId }).sort({ updatedAt: -1 }).lean()

  const shaped = await Promise.all(
    convs.map(async (conv) => {
      const participants = conv.participants as unknown[]
      const partnerId = participants.find((p) => p!.toString() !== userId)
      const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown> | null
      const name = (partnerDoc?.displayName as string) ?? "Unknown"

      const lastMsg = await MessageModel.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 })
        .lean()

      return {
        id: conv._id.toString(),
        type: conv.type,
        partner: {
          id: partnerDoc ? (partnerDoc._id as object).toString() : "",
          name,
          username: (partnerDoc?.username as string) ?? "",
          flag: "",
          avatarInitials: name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          avatarColor: "from-violet-500 to-indigo-500",
        },
        language: conv.language,
        status: conv.status,
        lastMessage: lastMsg
          ? { content: lastMsg.content, createdAt: lastMsg.createdAt.toISOString() }
          : null,
        unreadCount: 0,
        startedAt: conv.startedAt.toISOString(),
      }
    })
  )

  return NextResponse.json({ conversations: shaped })
}
```

- [ ] Create `src/app/api/friends/request/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import connectDB from "@/lib/db"
import User from "@/lib/models/User"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { targetUserId } = await req.json()
  if (!targetUserId) return NextResponse.json({ error: "targetUserId required" }, { status: 400 })

  await connectDB()

  const target = await User.findById(targetUserId)
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const alreadyRequested = target.friendRequests.some(
    (r: { from: { toString(): string } }) => r.from.toString() === session.user!.id
  )
  if (alreadyRequested) return NextResponse.json({ ok: true, alreadyRequested: true })

  await User.findByIdAndUpdate(targetUserId, {
    $push: { friendRequests: { from: session.user.id } },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] Create `src/app/api/friends/[id]/accept/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import connectDB from "@/lib/db"
import User from "@/lib/models/User"

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectDB()
  const { id: fromUserId } = await params
  const myId = session.user.id

  // Remove request + add mutual friends
  await User.findByIdAndUpdate(myId, {
    $pull: { friendRequests: { from: fromUserId } },
    $addToSet: { friends: fromUserId },
  })
  await User.findByIdAndUpdate(fromUserId, {
    $addToSet: { friends: myId },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] Commit:

```bash
git add src/app/api/session/[id]/token/route.ts src/app/api/conversations/route.ts src/app/api/friends/request/route.ts "src/app/api/friends/[id]/accept/route.ts"
git commit -m "feat: LiveKit token, conversations list, friend request/accept APIs"
```

---

## Task 9: MatchConfigForm + SearchingState components

**Files:**
- Create: `src/components/match/MatchConfigForm.tsx`
- Create: `src/components/match/SearchingState.tsx`

- [ ] Create `src/components/match/MatchConfigForm.tsx`:

```typescript
"use client"

import { cn } from "@/lib/utils"
import { languageOptions } from "@/lib/mock-data"

const INTERESTS = ["Anime", "Travel", "Gaming", "Music", "Food", "Books", "Movies", "Fitness"]

interface MatchConfigFormProps {
  targetLanguage: string
  nativeLanguage: string
  interests: string[]
  onTargetLanguage: (lang: string) => void
  onNativeLanguage: (lang: string) => void
  onInterests: (interests: string[]) => void
}

export function MatchConfigForm({
  targetLanguage,
  nativeLanguage,
  interests,
  onTargetLanguage,
  onNativeLanguage,
  onInterests,
}: MatchConfigFormProps) {
  const toggleInterest = (i: string) =>
    onInterests(
      interests.includes(i) ? interests.filter((x) => x !== i) : [...interests, i]
    )

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          I want to practice
        </p>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => onTargetLanguage(l.code)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                targetLanguage === l.code
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <span>{l.flag}</span> {l.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          My native language
        </p>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => onNativeLanguage(l.code)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                nativeLanguage === l.code
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <span>{l.flag}</span> {l.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Shared interests (optional)
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleInterest(i)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                interests.includes(i)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {i}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] Create `src/components/match/SearchingState.tsx`:

```typescript
"use client"

import { Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SearchingStateProps {
  onCancel: () => void
}

export function SearchingState({ onCancel }: SearchingStateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="relative flex size-32 items-center justify-center">
        <span className="absolute size-32 animate-ping rounded-full bg-primary/20" />
        <span className="absolute size-24 animate-pulse rounded-full bg-primary/30" />
        <Loader2 className="size-12 animate-spin text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">Finding your partner...</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Matching you with someone who speaks your target language
        </p>
      </div>
      <Button variant="outline" onClick={onCancel}>
        <X className="size-4" /> Cancel
      </Button>
    </div>
  )
}
```

- [ ] Commit:

```bash
git add src/components/match/MatchConfigForm.tsx src/components/match/SearchingState.tsx
git commit -m "feat: MatchConfigForm and SearchingState components"
```

---

## Task 10: MatchFoundModal component

**Files:**
- Create: `src/components/match/MatchFoundModal.tsx`

- [ ] Create `src/components/match/MatchFoundModal.tsx`:

```typescript
"use client"

import { MessageSquare, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import type { MatchResult } from "@/types"

interface MatchFoundModalProps {
  result: MatchResult
  onStartChat: () => void
  onJoinVideo: () => void
  onSkip: () => void
}

export function MatchFoundModal({ result, onStartChat, onJoinVideo, onSkip }: MatchFoundModalProps) {
  const { partner, compatibilityPct } = result

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl">
        <Badge className="mx-auto mb-4 bg-emerald-500 hover:bg-emerald-500">
          ● Match Found
        </Badge>

        <Avatar className="mx-auto size-20">
          <AvatarFallback className={`bg-gradient-to-br ${partner.avatarColor} text-xl text-white`}>
            {partner.avatarInitials}
          </AvatarFallback>
        </Avatar>

        <h2 className="mt-3 text-lg font-semibold">
          {partner.name} {partner.flag}
        </h2>
        <p className="text-sm text-muted-foreground">{partner.country}</p>

        <div className="mx-auto mt-2 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          ✦ {compatibilityPct}% Match
        </div>

        {partner.native.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {(partner.native as { name: string }[]).map((l) => (
              <span key={l.name} className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                {l.name} · Native
              </span>
            ))}
            {(partner.learning as { name: string }[]).map((l) => (
              <span key={l.name} className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                {l.name}
              </span>
            ))}
          </div>
        )}

        {(partner.interests as string[]).length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {(partner.interests as string[]).slice(0, 3).map((i) => (
              <span key={i} className="rounded-md border bg-muted/50 px-2 py-0.5 text-xs">
                {i}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={onStartChat}>
            <MessageSquare className="size-4" /> Start Chat
          </Button>
          <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={onJoinVideo}>
            <Video className="size-4" /> Join Video Session
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onSkip}>
            Skip this match
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] Commit:

```bash
git add src/components/match/MatchFoundModal.tsx
git commit -m "feat: MatchFoundModal component"
```

---

## Task 11: /match mode picker + /match/chat page

**Files:**
- Replace: `src/app/(app)/match/page.tsx`
- Create: `src/app/(app)/match/chat/page.tsx`

- [ ] Replace `src/app/(app)/match/page.tsx` with mode picker:

```typescript
import Link from "next/link"
import { MessageSquare, Video } from "lucide-react"

export default function MatchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Find a Match</h1>
        <p className="mt-1 text-muted-foreground">Choose how you want to connect</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/match/chat"
          className="group flex flex-col gap-4 rounded-2xl border bg-card p-6 transition-colors hover:border-blue-500/50 hover:bg-blue-500/5"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
            <MessageSquare className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Chat Match</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Text-based language exchange. No camera required — just type and connect.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Instant", "Text only", "Save history"].map((t) => (
              <span key={t} className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        </Link>

        <Link
          href="/match/video"
          className="group flex flex-col gap-4 rounded-2xl border bg-card p-6 transition-colors hover:border-violet-500/50 hover:bg-violet-500/5"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
            <Video className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Video Match</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Video + voice + chat. Camera optional — voice-only mode available.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Video", "Voice", "In-call chat"].map((t) => (
              <span key={t} className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] Create `src/app/(app)/match/chat/page.tsx`:

```typescript
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MatchConfigForm } from "@/components/match/MatchConfigForm"
import { SearchingState } from "@/components/match/SearchingState"
import { MatchFoundModal } from "@/components/match/MatchFoundModal"
import type { MatchPhase, MatchResult } from "@/types"

export default function ChatMatchPage() {
  const router = useRouter()
  const [phase, setPhase] = React.useState<MatchPhase>("idle")
  const [targetLanguage, setTargetLanguage] = React.useState("KO")
  const [nativeLanguage, setNativeLanguage] = React.useState("EN")
  const [interests, setInterests] = React.useState<string[]>([])
  const [matchResult, setMatchResult] = React.useState<MatchResult | null>(null)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
  }

  const handleCancel = async () => {
    stopPolling()
    setPhase("idle")
  }

  const handleFind = async () => {
    setPhase("searching")
    const res = await fetch("/api/match/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLanguage, nativeLanguage, interests }),
    })
    const data = await res.json()

    if (data.matched) {
      setMatchResult(data)
      setPhase("found")
      return
    }

    // Poll until matched
    pollRef.current = setInterval(async () => {
      const poll = await fetch(`/api/match/chat?requestId=${data.requestId}`)
      const pollData = await poll.json()
      if (pollData.matched) {
        stopPolling()
        setMatchResult(pollData)
        setPhase("found")
      }
    }, 2000)
  }

  React.useEffect(() => () => stopPolling(), [])

  if (phase === "searching") return <SearchingState onCancel={handleCancel} />

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
            <MessageSquare className="size-5" />
          </div>
          <h1 className="text-2xl font-bold">Chat Match</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Find a text conversation partner</p>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <MatchConfigForm
          targetLanguage={targetLanguage}
          nativeLanguage={nativeLanguage}
          interests={interests}
          onTargetLanguage={setTargetLanguage}
          onNativeLanguage={setNativeLanguage}
          onInterests={setInterests}
        />

        <div className="mt-6 border-t pt-5">
          <Button
            size="lg"
            className="h-12 w-full bg-blue-600 text-base hover:bg-blue-700"
            disabled={!targetLanguage || !nativeLanguage}
            onClick={handleFind}
          >
            <MessageSquare className="size-5" /> Find Chat Partner
          </Button>
        </div>
      </div>

      {matchResult && phase === "found" && (
        <MatchFoundModal
          result={matchResult}
          onStartChat={() => router.push(`/session/chat/${matchResult.conversationId}`)}
          onJoinVideo={() => router.push(`/session/video/${matchResult.conversationId}`)}
          onSkip={() => { setMatchResult(null); setPhase("idle") }}
        />
      )}
    </div>
  )
}
```

- [ ] Commit:

```bash
git add "src/app/(app)/match/page.tsx" "src/app/(app)/match/chat/page.tsx"
git commit -m "feat: match mode picker and chat match page"
```

---

## Task 12: ChatSession component + /session/chat/[id] page

**Files:**
- Create: `src/components/session/ChatSession.tsx`
- Create: `src/app/session/chat/[id]/page.tsx`

- [ ] Create `src/components/session/ChatSession.tsx`:

```typescript
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calendar, PhoneOff, Send, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Message, MatchResult } from "@/types"

interface ChatSessionProps {
  conversationId: string
  partner: MatchResult["partner"]
}

export function ChatSession({ conversationId, partner }: ChatSessionProps) {
  const router = useRouter()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // Poll for new messages every 3s (upgrade to SSE/WebSockets in production)
  React.useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/session/${conversationId}/messages`)
      const data = await res.json()
      if (data.messages) setMessages(data.messages)
    }
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [conversationId])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput("")
    await fetch(`/api/session/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    setSending(false)
  }

  const handleEnd = async () => {
    await fetch(`/api/session/${conversationId}/end`, { method: "POST" })
    router.push("/dashboard")
  }

  const handleAddFriend = async () => {
    await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: partner.id }),
    })
  }

  return (
    <div className="dark fixed inset-0 flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className={`bg-gradient-to-br ${partner.avatarColor} text-white`}>
              {partner.avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{partner.name} {partner.flag}</p>
            <p className="text-xs text-white/50">{partner.country} · Chat session</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleAddFriend}
          >
            <UserPlus className="size-4" /> Add Friend
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => router.push("/schedule")}
          >
            <Calendar className="size-4" /> Schedule
          </Button>
          <button
            onClick={handleEnd}
            className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium hover:bg-red-700"
          >
            <PhoneOff className="size-4" /> End
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-white/30">
              Say hello! Start the conversation.
            </p>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderId !== partner.id
            return (
              <div key={msg.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                {!isMine && (
                  <Avatar className="size-7 shrink-0 mt-1">
                    <AvatarFallback className={`bg-gradient-to-br ${partner.avatarColor} text-xs text-white`}>
                      {partner.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[65%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isMine
                    ? "rounded-br-sm bg-violet-600"
                    : "rounded-bl-sm bg-white/10"
                }`}>
                  {msg.content}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl bg-white/10 px-4 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-white/30"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-white transition-colors disabled:opacity-40 hover:bg-violet-700"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] Create `src/app/session/chat/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import connectDB from "@/lib/db"
import Conversation from "@/lib/models/Conversation"
import User from "@/lib/models/User"
import { ChatSession } from "@/components/session/ChatSession"

export default async function ChatSessionPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return notFound()

  await connectDB()
  const { id } = await params

  const conv = await Conversation.findById(id).lean() as Record<string, unknown> | null
  if (!conv) return notFound()

  const participants = conv.participants as unknown[]
  const partnerId = participants.find((p) => p!.toString() !== session.user!.id)
  const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown> | null
  if (!partnerDoc) return notFound()

  const name = (partnerDoc.displayName as string) ?? "Partner"
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  const partner = {
    id: (partnerDoc._id as object).toString(),
    name,
    username: (partnerDoc.username as string) ?? "",
    country: (partnerDoc.country as string) ?? "",
    flag: "",
    avatarInitials: initials,
    avatarColor: "from-violet-500 to-indigo-500",
    native: partnerDoc.nativeLanguages as unknown[],
    learning: partnerDoc.learningLanguages as unknown[],
    interests: [] as string[],
  }

  return <ChatSession conversationId={id} partner={partner as Parameters<typeof ChatSession>[0]["partner"]} />
}
```

- [ ] Commit:

```bash
git add src/components/session/ChatSession.tsx "src/app/session/chat/[id]/page.tsx"
git commit -m "feat: ChatSession component and /session/chat/[id] page"
```

---

## Task 13: PreJoinScreen + /match/video page

**Files:**
- Create: `src/components/session/PreJoinScreen.tsx`
- Create: `src/app/(app)/match/video/page.tsx`

- [ ] Create `src/components/session/PreJoinScreen.tsx`:

```typescript
"use client"

import * as React from "react"
import { Camera, CameraOff, Mic, MicOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PreJoinScreenProps {
  onFindPartner: (cameraEnabled: boolean, micEnabled: boolean) => void
  onCancel: () => void
}

export function PreJoinScreen({ onFindPartner, onCancel }: PreJoinScreenProps) {
  const [cameraEnabled, setCameraEnabled] = React.useState(true)
  const [micEnabled, setMicEnabled] = React.useState(true)
  const [stream, setStream] = React.useState<MediaStream | null>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  React.useEffect(() => {
    if (!cameraEnabled) {
      stream?.getVideoTracks().forEach((t) => t.stop())
      setStream(null)
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        setStream(s)
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => setCameraEnabled(false))
  }, [cameraEnabled])

  React.useEffect(() => () => { stream?.getTracks().forEach((t) => t.stop()) }, [stream])

  const bothOff = !cameraEnabled && !micEnabled

  const Toggle = ({
    enabled,
    onToggle,
    Icon,
    OffIcon,
    label,
  }: {
    enabled: boolean
    onToggle: () => void
    Icon: React.ElementType
    OffIcon: React.ElementType
    label: string
  }) => (
    <div className={cn("flex items-center justify-between rounded-xl border p-4", !enabled && "border-red-500/30 bg-red-500/5")}>
      <div className="flex items-center gap-3">
        {enabled
          ? <Icon className="size-5 text-emerald-400" />
          : <OffIcon className="size-5 text-red-400" />
        }
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className={cn("text-xs", enabled ? "text-emerald-400" : "text-red-400")}>
            {enabled ? "On" : "Off"}
          </p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors",
          enabled ? "bg-emerald-500" : "bg-zinc-600"
        )}
      >
        <span className={cn(
          "absolute top-1 size-4 rounded-full bg-white transition-transform",
          enabled ? "translate-x-6" : "translate-x-1"
        )} />
      </button>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold">Set up your video</h1>
        <p className="mt-1 text-muted-foreground">Configure camera and microphone before matching</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Camera preview */}
        <div className="space-y-2">
          <div className="relative aspect-video overflow-hidden rounded-xl border bg-zinc-900">
            {cameraEnabled && stream ? (
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <CameraOff className="size-10 text-white/20" />
                <p className="text-xs text-white/30">Camera is off</p>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">Your preview</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3">
          <div className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
            bothOff ? "border-red-500/30 bg-red-500/5 text-red-400" : "bg-muted/40 text-muted-foreground"
          )}>
            <span className={cn("size-2 rounded-full", bothOff ? "bg-red-500" : "bg-emerald-500")} />
            {bothOff ? "At least one device must be on" : `Camera ${cameraEnabled ? "ON" : "OFF"} · Mic ${micEnabled ? "ON" : "OFF"}`}
          </div>

          <Toggle
            enabled={cameraEnabled}
            onToggle={() => setCameraEnabled((v) => !v)}
            Icon={Camera}
            OffIcon={CameraOff}
            label="Camera"
          />
          <Toggle
            enabled={micEnabled}
            onToggle={() => setMicEnabled((v) => !v)}
            Icon={Mic}
            OffIcon={MicOff}
            label="Microphone"
          />

          {!cameraEnabled && micEnabled && (
            <p className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-xs text-yellow-300">
              💡 Voice-only mode — partner can hear you but not see you.
            </p>
          )}

          <Button
            size="lg"
            className="mt-2 h-12 bg-violet-600 text-base hover:bg-violet-700"
            disabled={bothOff}
            onClick={() => onFindPartner(cameraEnabled, micEnabled)}
          >
            Find Partner
          </Button>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] Create `src/app/(app)/match/video/page.tsx`:

```typescript
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MatchConfigForm } from "@/components/match/MatchConfigForm"
import { SearchingState } from "@/components/match/SearchingState"
import { MatchFoundModal } from "@/components/match/MatchFoundModal"
import { PreJoinScreen } from "@/components/session/PreJoinScreen"
import type { MatchPhase, MatchResult } from "@/types"

export default function VideoMatchPage() {
  const router = useRouter()
  const [phase, setPhase] = React.useState<MatchPhase>("idle")
  const [targetLanguage, setTargetLanguage] = React.useState("KO")
  const [nativeLanguage, setNativeLanguage] = React.useState("EN")
  const [interests, setInterests] = React.useState<string[]>([])
  const [matchResult, setMatchResult] = React.useState<MatchResult | null>(null)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => { if (pollRef.current) clearInterval(pollRef.current) }

  const startSearching = async () => {
    setPhase("searching")
    const res = await fetch("/api/match/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetLanguage, nativeLanguage, interests }),
    })
    const data = await res.json()

    if (data.matched) {
      setMatchResult(data)
      setPhase("found")
      return
    }

    pollRef.current = setInterval(async () => {
      const poll = await fetch(`/api/match/video?requestId=${data.requestId}`)
      const pollData = await poll.json()
      if (pollData.matched) {
        stopPolling()
        setMatchResult(pollData)
        setPhase("found")
      }
    }, 2000)
  }

  React.useEffect(() => () => stopPolling(), [])

  if (phase === "searching") return (
    <SearchingState onCancel={() => { stopPolling(); setPhase("prejoin") }} />
  )

  if (phase === "prejoin") return (
    <PreJoinScreen
      onFindPartner={startSearching}
      onCancel={() => setPhase("idle")}
    />
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-500">
            <Video className="size-5" />
          </div>
          <h1 className="text-2xl font-bold">Video Match</h1>
        </div>
        <p className="mt-1 text-muted-foreground">Connect over video, voice, or both</p>
      </div>

      <div className="rounded-2xl border bg-card p-6">
        <MatchConfigForm
          targetLanguage={targetLanguage}
          nativeLanguage={nativeLanguage}
          interests={interests}
          onTargetLanguage={setTargetLanguage}
          onNativeLanguage={setNativeLanguage}
          onInterests={setInterests}
        />

        <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-violet-300">
          📹 Camera and microphone setup on the next screen.
        </div>

        <div className="mt-4 border-t pt-5">
          <Button
            size="lg"
            className="h-12 w-full bg-violet-600 text-base hover:bg-violet-700"
            disabled={!targetLanguage || !nativeLanguage}
            onClick={() => setPhase("prejoin")}
          >
            <Video className="size-5" /> Continue to Preview
          </Button>
        </div>
      </div>

      {matchResult && phase === "found" && (
        <MatchFoundModal
          result={matchResult}
          onStartChat={() => router.push(`/session/chat/${matchResult.conversationId}`)}
          onJoinVideo={() => router.push(`/session/video/${matchResult.conversationId}`)}
          onSkip={() => { setMatchResult(null); setPhase("idle") }}
        />
      )}
    </div>
  )
}
```

- [ ] Commit:

```bash
git add src/components/session/PreJoinScreen.tsx "src/app/(app)/match/video/page.tsx"
git commit -m "feat: PreJoinScreen component and video match page"
```

---

## Task 14: VideoSession component + /session/video/[id] page

**Files:**
- Create: `src/components/session/SessionControls.tsx`
- Create: `src/components/session/ChatPanel.tsx`
- Create: `src/components/session/VideoSession.tsx`
- Create: `src/app/session/video/[id]/page.tsx`

- [ ] Create `src/components/session/SessionControls.tsx`:

```typescript
"use client"

import { Camera, CameraOff, MessageSquare, Mic, MicOff, PhoneOff, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface SessionControlsProps {
  cameraEnabled: boolean
  micEnabled: boolean
  chatOpen: boolean
  onToggleCamera: () => void
  onToggleMic: () => void
  onToggleChat: () => void
  onAddFriend: () => void
  onEnd: () => void
}

function CtrlBtn({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-12 items-center justify-center rounded-full transition-colors",
        active ? "bg-primary text-white" : "bg-white/10 text-white hover:bg-white/20"
      )}
    >
      {children}
    </button>
  )
}

export function SessionControls({
  cameraEnabled,
  micEnabled,
  chatOpen,
  onToggleCamera,
  onToggleMic,
  onToggleChat,
  onAddFriend,
  onEnd,
}: SessionControlsProps) {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-5">
      <CtrlBtn onClick={onToggleCamera} label={cameraEnabled ? "Turn off camera" : "Turn on camera"}>
        {cameraEnabled ? <Camera className="size-5" /> : <CameraOff className="size-5" />}
      </CtrlBtn>
      <CtrlBtn onClick={onToggleMic} label={micEnabled ? "Mute" : "Unmute"}>
        {micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
      </CtrlBtn>
      <CtrlBtn onClick={onToggleChat} active={chatOpen} label="Chat">
        <MessageSquare className="size-5" />
      </CtrlBtn>
      <CtrlBtn onClick={onAddFriend} label="Add friend">
        <UserPlus className="size-5" />
      </CtrlBtn>
      <button
        onClick={onEnd}
        className="flex h-12 items-center gap-2 rounded-full bg-red-600 px-5 font-medium text-white hover:bg-red-700"
      >
        <PhoneOff className="size-5" /> End
      </button>
    </div>
  )
}
```

- [ ] Create `src/components/session/ChatPanel.tsx`:

```typescript
"use client"

import * as React from "react"
import { Send, X } from "lucide-react"
import type { Message } from "@/types"

interface ChatPanelProps {
  messages: Message[]
  partnerId: string
  onSend: (content: string) => void
  onClose: () => void
}

export function ChatPanel({ messages, partnerId, onSend, onClose }: ChatPanelProps) {
  const [input, setInput] = React.useState("")
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput("")
  }

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-80 max-w-[85%] flex-col border-l border-white/10 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="font-semibold">Chat</h3>
        <button onClick={onClose} className="text-white/50 hover:text-white">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-white/30">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId !== partnerId
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                isMine ? "rounded-br-sm bg-violet-600" : "rounded-bl-sm bg-white/10"
              }`}>
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
            placeholder="Message..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="text-violet-400 disabled:opacity-40 hover:text-violet-300"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] Create `src/components/session/VideoSession.tsx`:

```typescript
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  LiveKitRoom,
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  AudioTrack,
  useTracks,
  useDataChannel,
} from "@livekit/components-react"
import "@livekit/components-styles"
import { Track } from "livekit-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SessionControls } from "./SessionControls"
import { ChatPanel } from "./ChatPanel"
import type { Message, MatchResult } from "@/types"

interface VideoSessionProps {
  conversationId: string
  partner: MatchResult["partner"]
  token: string
  serverUrl: string
}

function VideoSessionInner({
  conversationId,
  partner,
  onEnd,
}: {
  conversationId: string
  partner: MatchResult["partner"]
  onEnd: () => void
}) {
  const [chatOpen, setChatOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([])
  const { localParticipant } = useLocalParticipant()
  const remoteParticipants = useRemoteParticipants()
  const remoteTracks = useTracks([Track.Source.Camera], { onlySubscribed: true })
  const localTracks = useTracks([Track.Source.Camera], { onlySubscribed: false })

  const cameraEnabled = localParticipant.isCameraEnabled
  const micEnabled = localParticipant.isMicrophoneEnabled

  // LiveKit data channel for in-session chat
  const { send } = useDataChannel("chat", (msg) => {
    try {
      const decoded = new TextDecoder().decode(msg.payload)
      const parsed = JSON.parse(decoded) as Message
      setMessages((prev) => [...prev, parsed])
    } catch { /* ignore malformed */ }
  })

  const sendMessage = async (content: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      conversationId,
      senderId: localParticipant.identity,
      senderName: localParticipant.name ?? "You",
      senderInitials: "ME",
      senderAvatarColor: "from-violet-500 to-indigo-500",
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, msg])
    send(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true })
    // Also persist to DB
    await fetch(`/api/session/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
  }

  const addFriend = async () => {
    await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: partner.id }),
    })
  }

  const remoteVideoTrack = remoteTracks[0]
  const localVideoTrack = localTracks[0]

  return (
    <div className="dark fixed inset-0 flex flex-col bg-zinc-950 text-white">
      {/* Video stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {/* Remote video (large) */}
        {remoteVideoTrack ? (
          <VideoTrack trackRef={remoteVideoTrack} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar className="size-24">
              <AvatarFallback className={`bg-gradient-to-br ${partner.avatarColor} text-3xl text-white`}>
                {partner.avatarInitials}
              </AvatarFallback>
            </Avatar>
            <p className="text-lg font-semibold">{partner.name} {partner.flag}</p>
            <p className="text-sm text-white/50">Camera off</p>
          </div>
        )}

        {/* Local video (PiP) */}
        {localVideoTrack && (
          <div className="absolute bottom-4 right-4 h-32 w-24 overflow-hidden rounded-xl border border-white/20">
            <VideoTrack trackRef={localVideoTrack} className="h-full w-full object-cover" />
          </div>
        )}

        {/* Subscribe to remote audio */}
        {remoteParticipants.map((p) => (
          <AudioTrack key={p.identity} participant={p} source={Track.Source.Microphone} />
        ))}

        {/* Chat panel */}
        {chatOpen && (
          <ChatPanel
            messages={messages}
            partnerId={partner.id}
            onSend={sendMessage}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      {/* Controls */}
      <SessionControls
        cameraEnabled={cameraEnabled}
        micEnabled={micEnabled}
        chatOpen={chatOpen}
        onToggleCamera={() => localParticipant.setCameraEnabled(!cameraEnabled)}
        onToggleMic={() => localParticipant.setMicrophoneEnabled(!micEnabled)}
        onToggleChat={() => setChatOpen((v) => !v)}
        onAddFriend={addFriend}
        onEnd={onEnd}
      />
    </div>
  )
}

export function VideoSession({ conversationId, partner, token, serverUrl }: VideoSessionProps) {
  const router = useRouter()

  const handleEnd = async () => {
    await fetch(`/api/session/${conversationId}/end`, { method: "POST" })
    router.push("/dashboard")
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video
      onDisconnected={handleEnd}
    >
      <VideoSessionInner
        conversationId={conversationId}
        partner={partner}
        onEnd={handleEnd}
      />
    </LiveKitRoom>
  )
}
```

- [ ] Create `src/app/session/video/[id]/page.tsx`:

```typescript
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import connectDB from "@/lib/db"
import Conversation from "@/lib/models/Conversation"
import User from "@/lib/models/User"
import { AccessToken } from "livekit-server-sdk"
import { VideoSession } from "@/components/session/VideoSession"

export default async function VideoSessionPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return notFound()

  await connectDB()
  const { id } = await params

  const conv = await Conversation.findById(id).lean() as Record<string, unknown> | null
  if (!conv || conv.type !== "video") return notFound()

  const participants = conv.participants as unknown[]
  const partnerId = participants.find((p) => p!.toString() !== session.user!.id)
  const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown> | null
  if (!partnerDoc) return notFound()

  const roomName = (conv.livekitRoomName as string) ?? `lm-video-${id}`
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    { identity: session.user.id, name: session.user.name ?? "User" }
  )
  at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true })
  const token = await at.toJwt()

  const name = (partnerDoc.displayName as string) ?? "Partner"
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()

  const partner = {
    id: (partnerDoc._id as object).toString(),
    name,
    username: (partnerDoc.username as string) ?? "",
    country: (partnerDoc.country as string) ?? "",
    flag: "",
    avatarInitials: initials,
    avatarColor: "from-violet-500 to-indigo-500",
    native: partnerDoc.nativeLanguages as unknown[],
    learning: partnerDoc.learningLanguages as unknown[],
    interests: [] as string[],
  }

  return (
    <VideoSession
      conversationId={id}
      partner={partner as Parameters<typeof VideoSession>[0]["partner"]}
      token={token}
      serverUrl={process.env.LIVEKIT_URL!}
    />
  )
}
```

- [ ] Commit:

```bash
git add src/components/session/SessionControls.tsx src/components/session/ChatPanel.tsx src/components/session/VideoSession.tsx "src/app/session/video/[id]/page.tsx"
git commit -m "feat: VideoSession, SessionControls, ChatPanel components and /session/video/[id] page"
```

---

## Task 15: Messages inbox + cleanup

**Files:**
- Create: `src/components/messages/ConversationList.tsx`
- Create: `src/app/(app)/messages/page.tsx`
- Delete: `src/app/session/[id]/page.tsx`

- [ ] Create `src/components/messages/ConversationList.tsx`:

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, Video } from "lucide-react"
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
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
        <MessageSquare className="size-10 text-muted-foreground/30" />
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
```

- [ ] Create `src/app/(app)/messages/page.tsx`:

```typescript
import { Inbox } from "lucide-react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import connectDB from "@/lib/db"
import Conversation from "@/lib/models/Conversation"
import MessageModel from "@/lib/models/Message"
import User from "@/lib/models/User"
import { ConversationList } from "@/components/messages/ConversationList"
import type { Conversation as ConversationType } from "@/types"

export default async function MessagesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  await connectDB()
  const userId = session.user.id

  const convs = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .lean()

  const shaped: ConversationType[] = await Promise.all(
    convs.map(async (conv) => {
      const participants = conv.participants as unknown[]
      const partnerId = participants.find((p) => p!.toString() !== userId)
      const partnerDoc = await User.findById(partnerId).lean() as Record<string, unknown> | null
      const name = (partnerDoc?.displayName as string) ?? "Unknown"

      const lastMsg = await MessageModel.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 }).lean()

      return {
        id: conv._id.toString(),
        type: conv.type as "chat" | "video",
        partner: {
          id: partnerDoc ? (partnerDoc._id as object).toString() : "",
          name,
          username: (partnerDoc?.username as string) ?? "",
          flag: "",
          avatarInitials: name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
          avatarColor: "from-violet-500 to-indigo-500",
        },
        language: conv.language,
        status: conv.status as "active" | "ended",
        lastMessage: lastMsg
          ? { content: lastMsg.content, createdAt: lastMsg.createdAt.toISOString() }
          : undefined,
        unreadCount: 0,
        startedAt: conv.startedAt.toISOString(),
      }
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Inbox className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>
      <div className="rounded-xl border bg-card">
        <ConversationList conversations={shaped} />
      </div>
    </div>
  )
}
```

- [ ] Delete the old session page:

```bash
rm "src/app/session/[id]/page.tsx"
rmdir "src/app/session/[id]" 2>/dev/null || true
```

- [ ] Run build to catch any TypeScript errors:

```bash
npm run build 2>&1 | grep -E "error|Error" | head -30
```

Fix any type errors found before committing.

- [ ] Commit:

```bash
git add src/components/messages/ConversationList.tsx "src/app/(app)/messages/page.tsx"
git rm "src/app/session/[id]/page.tsx"
git commit -m "feat: messages inbox page and conversation list; remove old session page"
```

---

## Task 16: End-to-end smoke test

**Files:** none (verification only)

- [ ] Start dev server:

```bash
npm run dev
```

- [ ] Verify these routes load without 404 or crash:
  - http://localhost:3000/dashboard — shows Chat Match + Video Match buttons
  - http://localhost:3000/match — shows mode picker cards
  - http://localhost:3000/match/chat — shows language selector + Find Partner button
  - http://localhost:3000/match/video — shows language selector + Continue to Preview button
  - http://localhost:3000/messages — shows inbox (empty state)

- [ ] Verify sidebar shows:
  - `Languages` icon (not Mic)
  - "Chat Match" and "Video Match" nav items under "Match" section label
  - "Messages" nav item under "Social"

- [ ] Verify mobile nav shows 5 items: Home, Chat, Video, Messages, Friends

- [ ] Test Chat Match flow end-to-end (requires two browser windows logged in as different users):
  1. Browser A: `/match/chat` → select Korean / English → Find Chat Partner
  2. Browser B: `/match/chat` → select English / Korean → Find Chat Partner
  3. Both should reach MatchFoundModal within ~4s
  4. Browser A: click "Start Chat" → lands on `/session/chat/[id]`
  5. Send a message → appears in Browser B within 3s (polling interval)
  6. Click "End" → returns to dashboard

- [ ] Test Video Match pre-join:
  1. `/match/video` → Continue to Preview
  2. Camera preview appears, toggle camera off → preview goes to "Camera is off"
  3. Turn both off → Find Partner button disables + warning shows
  4. Turn mic back on → button re-enables

- [ ] Fix any issues found, commit fixes with descriptive messages.

- [ ] Final commit:

```bash
git add -A
git commit -m "feat: complete Chat Match + Video Match MVP implementation"
git push origin main
```
