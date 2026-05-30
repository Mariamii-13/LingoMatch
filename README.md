# SpeakFirst (Voxa)

> Voice-first global language learning social platform

Practice any language through real voice conversations with people around the world. AI matches you with the perfect partner based on your language goals, interests, and comfort level.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + Shadcn/ui
- **Database:** MongoDB + Mongoose
- **Auth:** NextAuth.js v5 (credentials + Google OAuth)
- **Animation:** Framer Motion
- **Voice:** WebRTC (Phase 4)
- **AI:** OpenAI (Phase 5)
- **Payments:** Stripe (Phase 6)

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Environment Variables

```
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
```

## Roadmap

- [x] Phase 1 — Frontend (all pages, design system)
- [x] Phase 2 — Backend + MongoDB + Auth
- [ ] Phase 3 — WebRTC voice sessions
- [ ] Phase 4 — AI matching + coaching
- [ ] Phase 5 — Stripe payments
- [ ] Phase 6 — Moderation + admin
