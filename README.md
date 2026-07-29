# LingoMatch

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

Optional:

```
# Where to forward error reports, in addition to the runtime logs. Any endpoint
# accepting a JSON POST works — a Slack or Discord incoming webhook, or a
# hosted error tracker. Unset means errors are logged and nothing is sent.
ERROR_REPORT_WEBHOOK_URL=https://hooks.example.com/...
```

Every failure the application knows about is logged as a single line prefixed
`lm-error`, so searching runtime logs for that token finds all of them. Each
carries an `id`; a 500 from the API returns the same value as `errorId`, and a
page that fails to render shows it to the user as `Reference:`.

## Roadmap

- [x] Phase 1 — Frontend (all pages, design system)
- [x] Phase 2 — Backend + MongoDB + Auth
- [ ] Phase 3 — WebRTC voice sessions
- [ ] Phase 4 — AI matching + coaching
- [ ] Phase 5 — Stripe payments
- [ ] Phase 6 — Moderation + admin
