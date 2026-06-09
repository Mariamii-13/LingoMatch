# LingoMatch — Chat Match & Video Match Redesign

**Date:** 2026-06-09  
**Status:** Approved for implementation

---

## Overview

Replace the single Voice Match flow with two distinct primary modes: **Chat Match** (text) and **Video Match** (video/voice/text). Remove Voice Match as a standalone feature. Voice exists only as part of Video Match when camera is off.

**Tech decisions:**
- Video real-time: **LiveKit** (`livekit-client` + `@livekit/components-react`)
- Chat real-time (in-session): **SSE** (Server-Sent Events via Next.js route handlers — no extra deps)
- Message persistence: **MongoDB** (`Message` + `Conversation` models)
- Matching queue: **MongoDB** with TTL index (auto-expires stale requests in 60s)

---

## Route Architecture

### New routes

```
src/app/
├── (app)/
│   ├── match/
│   │   ├── page.tsx               ← mode picker (Chat / Video cards)
│   │   ├── chat/page.tsx          ← Chat Match: language + interests config
│   │   └── video/page.tsx         ← Video Match: config → pre-join screen
│   └── messages/page.tsx          ← chat inbox (all conversations)
└── session/                        ← full-screen, outside (app) — no sidebar
    ├── chat/[id]/page.tsx          ← active chat session
    └── video/[id]/page.tsx         ← active video session (LiveKit room)
```

### Deleted routes

| File | Reason |
|------|--------|
| `src/app/(app)/match/page.tsx` | Replaced by `/match/chat` + `/match/video` |
| `src/app/session/[id]/page.tsx` | Replaced by type-split session routes |

### Updated files

| File | Change |
|------|--------|
| `src/app/(app)/dashboard/page.tsx` | Replace single CTA gradient bar → two equal buttons (Chat Match + Video Match) |
| `src/components/shared/sidebar.tsx` | "Find Match" (`Zap` → `/match`) becomes "Chat Match" + "Video Match" with section label; `Mic` logo → `Languages` icon |
| `src/components/shared/mobile-nav.tsx` | "Match" item → `/match` (mode picker keeps 5-item limit) |
| `src/types/index.ts` | Add `type: 'chat' \| 'video'` to `Session` + `ScheduledSession`; add `Message`, `Conversation`, `MatchRequest` types |
| `src/lib/mock-data.ts` | Add `type` field to existing `mockSessions` + `scheduledSessions`; update `pricing` copy (remove "Voice-only" language) |

---

## New API Routes

```
src/app/api/
├── match/
│   ├── chat/route.ts              POST — enter chat match queue; GET — poll by requestId
│   └── video/route.ts             POST — enter video match queue; GET — poll by requestId
├── session/
│   ├── [id]/messages/route.ts     GET: if Accept=text/event-stream → SSE; else → paginated history
│   │                              POST — send message (saves to DB + broadcasts via SSE)
│   ├── [id]/token/route.ts        GET — generate LiveKit JWT access token for room
│   └── [id]/end/route.ts          POST — mark conversation ended, record duration
├── conversations/route.ts         GET — list user's conversations (inbox)
└── friends/
    ├── request/route.ts           POST — send friend request
    └── [id]/accept/route.ts       POST — accept friend request
```

### Match flow (server side)

```
POST /api/match/chat
  body: { targetLanguage, nativeLanguage, interests[] }

1. Create MatchRequest doc: { userId, type: 'chat', targetLanguage, interests, status: 'waiting', createdAt }
2. Query for compatible waiting request from another user (language match, not self)
3. If found:
   - Create Conversation doc: { participants: [userA, userB], type: 'chat', language, status: 'active' }
   - Update both MatchRequests status → 'matched'
   - Return { conversationId, partner }
4. If not found:
   - Return { requestId } — client polls GET /api/match/[requestId] every 2s
```

---

## Database Schema

### New model: `Conversation`

```typescript
// src/lib/models/Conversation.ts
{
  participants: [ObjectId, ObjectId]   // ref: User — always exactly 2
  type: 'chat' | 'video'
  language: string                     // e.g. 'KO' — the language being practiced
  status: 'active' | 'ended'
  livekitRoomName?: string             // only for video type; format: `lm-video-${conversationId}`
  startedAt: Date
  endedAt?: Date
  durationSeconds?: number
  timestamps: true
}
```

### New model: `Message`

```typescript
// src/lib/models/Message.ts
{
  conversationId: ObjectId             // ref: Conversation
  senderId: ObjectId                   // ref: User
  content: string                      // max 2000 chars
  createdAt: Date
  // Index: { conversationId: 1, createdAt: 1 }
}
```

### New model: `MatchRequest`

```typescript
// src/lib/models/MatchRequest.ts
{
  userId: ObjectId                     // ref: User
  type: 'chat' | 'video'
  targetLanguage: string
  nativeLanguage: string
  interests: string[]
  status: 'waiting' | 'matched' | 'cancelled'
  conversationId?: ObjectId            // set when matched
  createdAt: Date                      // TTL index: expires after 60s if still 'waiting'
}
```

### Updated model: `User`

Add two fields to `UserSchema`:

```typescript
friends: { type: [Schema.Types.ObjectId], ref: 'User', default: [] }
friendRequests: {
  type: [{ from: Schema.Types.ObjectId, ref: 'User', createdAt: Date }],
  default: []
}
```

---

## TypeScript Types

Add to `src/types/index.ts`:

```typescript
// Update existing
export interface Session {
  // ... existing fields
  type: 'chat' | 'video'   // ADD
}

export interface ScheduledSession {
  // ... existing fields
  type: 'chat' | 'video'   // ADD
}

// New types
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
  lastMessage?: Message
  unreadCount: number
  startedAt: string
}

export type MatchPhase = 'idle' | 'searching' | 'found'

export interface MatchResult {
  conversationId: string
  partner: Pick<User, 'id' | 'name' | 'username' | 'country' | 'flag' | 'avatarInitials' | 'avatarColor' | 'native' | 'learning' | 'interests'>
  compatibilityPct: number  // server generates: 75 + ((hashInt(userAId + userBId)) % 22) — deterministic per pair, AI-ready field
}
```

---

## New Components

```
src/components/
├── match/
│   ├── MatchConfigForm.tsx      shared language + interest selector (used by both chat + video pages)
│   ├── SearchingState.tsx       animated searching UI (ping rings + cancel)
│   └── MatchFoundModal.tsx      overlay: partner profile + "Start Chat" / "Join Video" buttons
├── session/
│   ├── PreJoinScreen.tsx        camera preview + cam/mic toggles + Find Partner button
│   ├── ChatSession.tsx          full-screen chat: message list + input + header
│   ├── VideoSession.tsx         LiveKit room wrapper: video tiles + control bar + chat panel
│   ├── SessionControls.tsx      bottom control bar (cam, mic, chat toggle, add friend, end)
│   └── ChatPanel.tsx            slide-in panel for in-video-session chat
└── messages/
    └── ConversationList.tsx     left panel: search + conversation items with unread badges
```

---

## Page Flows

### Chat Match

```
/match/chat
  → user selects language + interests
  → clicks "Find Chat Partner"
  → SearchingState (polls /api/match/chat every 2s)
  → MatchFoundModal appears (partner profile)
  → clicks "Start Chat" → navigate to /session/chat/[conversationId]

/session/chat/[id]  (full-screen, no sidebar)
  → ChatSession component
  → SSE connection to /api/session/[id]/messages for real-time
  → POST /api/session/[id]/messages to send
  → "Add Friend" → POST /api/friends/request
  → "Schedule" → navigate to /schedule with prefilled partner
  → "End" → POST /api/session/[id]/end → navigate to /dashboard
```

### Video Match

```
/match/video
  → user selects language + interests
  → clicks "Continue to Preview"
  → PreJoinScreen appears (camera preview, cam/mic toggles)
  → cam OFF + mic OFF → "Find Partner" button disabled + warning shown
  → clicks "Find Partner"
  → SearchingState
  → MatchFoundModal appears
  → clicks "Join Video Session" → navigate to /session/video/[conversationId]

/session/video/[id]  (full-screen, no sidebar)
  → GET /api/session/[id]/token → LiveKit JWT
  → VideoSession component (LiveKit room)
  → Controls: cam toggle, mic toggle, chat panel, add friend, end
  → Chat panel uses LiveKit data channel for in-session messages
  → Messages also POST to /api/session/[id]/messages for persistence
  → "End" → POST /api/session/[id]/end → navigate to /dashboard
```

### Match Found Modal — both flows

The modal shows after a partner is found regardless of mode:
- Partner avatar, name, flag, country
- Languages (native + learning)
- Interests (highlight shared ones)
- Compatibility % (mock value for now — AI-ready field)
- **"Start Chat"** button (blue) — navigates to chat session
- **"Join Video Session"** button (violet) — navigates to `/session/video/[id]`; LiveKit handles camera/mic permission request on room join (native browser prompt). No separate pre-join needed from this path.
- **"Skip"** ghost button

Both buttons available on every match — user can switch mode after seeing the partner. The "Join Video Session" button is available even from a Chat Match context; permissions are requested on the video session page itself.

---

## State Management

All state is local React state (no global store needed for MVP).

### Chat/Video Match pages

```typescript
const [phase, setPhase] = useState<MatchPhase>('idle')
const [targetLanguage, setTargetLanguage] = useState<string>('')
const [interests, setInterests] = useState<string[]>([])
const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
const [requestId, setRequestId] = useState<string | null>(null)
```

### PreJoinScreen

```typescript
const [cameraEnabled, setCameraEnabled] = useState(true)
const [micEnabled, setMicEnabled] = useState(true)
const [stream, setStream] = useState<MediaStream | null>(null)
// Constraint: !cameraEnabled && !micEnabled → disable Find Partner button
```

### Chat session

```typescript
const [messages, setMessages] = useState<Message[]>([])
const [input, setInput] = useState('')
// SSE via useEffect: new EventSource(`/api/session/${id}/messages`)
```

### Video session

```typescript
// LiveKit handles track/participant state via @livekit/components-react hooks
// Local additions:
const [chatPanelOpen, setChatPanelOpen] = useState(false)
const [messages, setMessages] = useState<Message[]>([])
```

---

## Environment Variables

Add to `.env.local`:

```bash
LIVEKIT_API_KEY=          # from LiveKit Cloud dashboard
LIVEKIT_API_SECRET=       # from LiveKit Cloud dashboard
LIVEKIT_URL=              # wss://your-project.livekit.cloud
```

---

## New Dependencies

```bash
npm install livekit-client @livekit/components-react livekit-server-sdk
```

| Package | Purpose |
|---------|---------|
| `livekit-client` | WebRTC client for video/audio tracks |
| `@livekit/components-react` | React hooks: `useLocalParticipant`, `useRemoteParticipants`, `useDataChannel` |
| `livekit-server-sdk` | Server-side token generation (`AccessToken`) |

---

## Sidebar & Nav Changes

### `sidebar.tsx`

Replace the single "Find Match" nav item:

```typescript
// Before
{ label: "Find Match", href: "/match", icon: Zap }

// After — with section label
// Section: "Match"
{ label: "Chat Match", href: "/match/chat", icon: MessageSquare }
{ label: "Video Match", href: "/match/video", icon: Video }
```

Change logo icon: `Mic` → `Languages` (from lucide-react).

Active state: `/match/chat` active when `pathname.startsWith('/match/chat')` or `pathname.startsWith('/session/chat')`. Same pattern for video.

### `mobile-nav.tsx`

"Match" item stays but points to `/match` (mode picker):
```typescript
{ label: "Match", href: "/match", icon: Zap }
```
The mode picker at `/match` shows two large cards (Chat / Video) — takes 2 seconds to navigate from there.

---

## Dashboard CTA Change

Replace in `dashboard/page.tsx`:

```tsx
// Before — single gradient banner
<div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 ...">
  <span>Find a Conversation</span>
  <Button render={<Link href="/match" />}>Find Now →</Button>
</div>

// After — two equal buttons
<div className="rounded-2xl border border-primary/20 bg-card p-5">
  <p className="mb-4 text-sm font-semibold text-muted-foreground">Start a conversation</p>
  <div className="grid grid-cols-2 gap-3">
    <Button asChild size="lg" className="h-auto flex-col gap-1 py-4 bg-blue-600 hover:bg-blue-700">
      <Link href="/match/chat">
        <MessageSquare className="size-5" />
        <span className="text-sm font-semibold">Chat Match</span>
        <span className="text-xs opacity-75">Text · Instant</span>
      </Link>
    </Button>
    <Button asChild size="lg" className="h-auto flex-col gap-1 py-4 bg-violet-600 hover:bg-violet-700">
      <Link href="/match/video">
        <Video className="size-5" />
        <span className="text-sm font-semibold">Video Match</span>
        <span className="text-xs opacity-75">Video · Voice · Chat</span>
      </Link>
    </Button>
  </div>
</div>
```

---

## AI-Ready Architecture

These hooks are built in now and wired to real data later:

| Hook | Where | Future use |
|------|-------|-----------|
| `compatibilityPct` on `MatchResult` | MatchFoundModal | AI scoring based on interests/goals |
| `interests[]` on `MatchRequest` | Matching query | AI semantic interest matching |
| `targetLanguage` + `nativeLanguage` | Matching query | AI-weighted language pairing |
| `conversationModes` on User | Profile | AI personality-based partner suggestions |

The matching query in `/api/match/chat` and `/api/match/video` currently does:
```
{ type, targetLanguage, status: 'waiting', userId: { $ne: currentUserId } }
```
Future AI version replaces/augments this with a vector similarity search or scoring function — same API contract, different query.

---

## What Is NOT Changed

- Auth flow (NextAuth, Google OAuth, Credentials)
- Onboarding flow (`/languages`, `/profile`, `/interests`, `/ai-preferences`, `/mode`)
- Admin panel
- Friends page (existing UI unchanged; only friend request API added)
- Schedule page (unchanged; future: pre-fill from session end)
- Community page
- Profile page
- Subscription/pricing page (only copy update — remove "Voice-only" from Free tier)
- `conversationModes` array in mock-data (kept for profile; removed from match config UI)
- Cloudinary upload
- MongoDB connection (`lib/db.ts`)

---

## Implementation Order

1. Install dependencies (`livekit-client`, `@livekit/components-react`, `livekit-server-sdk`)
2. Add environment variables (LiveKit keys)
3. New Mongoose models: `Conversation`, `Message`, `MatchRequest`
4. Update `src/types/index.ts`
5. Update `src/lib/mock-data.ts` (add `type` field to sessions)
6. Update `User` model (add `friends`, `friendRequests`)
7. New API routes (match, session, conversations, friends)
8. New components (MatchConfigForm, SearchingState, MatchFoundModal, PreJoinScreen, ChatSession, VideoSession, SessionControls, ChatPanel, ConversationList)
9. New pages (match/page, match/chat/page, match/video/page, session/chat/[id]/page, session/video/[id]/page, messages/page)
10. Update dashboard CTA
11. Update sidebar + mobile nav
12. Delete old match/page.tsx and session/[id]/page.tsx
