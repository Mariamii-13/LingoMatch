# Avatar Upload via Cloudinary — Design Spec

**Date:** 2026-06-09  
**Scope:** MVP avatar upload only. Chat system is a separate feature.

---

## Architecture

### Data flow

```
User picks file → client validates (type + 2MB) → POST /api/upload/avatar (FormData)
→ server validates (auth + 2MB) → upload to Cloudinary (lingomatch/avatars/)
→ update User.avatar in MongoDB → return { url } → UI shows real avatar image
```

### Storage split

| Data | Store |
|------|-------|
| Avatar image file | Cloudinary (`lingomatch/avatars/`) |
| Avatar URL + metadata | MongoDB (`Upload` collection) |
| User's current avatar URL | MongoDB (`User.avatar` field) |

---

## Environment

Add to `.env.local` (never commit this file):

```
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

---

## Backend

### API route: `POST /api/upload/avatar`

**Already written.** Two changes needed:

1. Add 2MB server-side size check before uploading to Cloudinary:
   ```ts
   if (file.size > 2 * 1024 * 1024) {
     return NextResponse.json({ error: 'File too large. Max 2MB.' }, { status: 400 })
   }
   ```
2. Accept images only — validate `file.type.startsWith('image/')`.

### MongoDB models

- `User` model: add `avatar: String` field (optional).
- `Upload` model: already supports `type: 'avatar'`. No changes.

---

## Frontend

### Types (`src/types/index.ts`)

Add `avatar?: string` to `User` interface.

### Settings page (`src/app/(app)/settings/page.tsx`)

**Account tab — avatar section:**

- Replace static `<Button variant="outline">Change avatar</Button>` with a wired upload trigger.
- Hidden `<input type="file" accept="image/*" ref={fileInputRef}>`.
- On button click → `fileInputRef.current.click()`.
- On file select:
  1. Client-side check: reject if `file.size > 2 * 1024 * 1024` → show toast error.
  2. Client-side check: reject if not `image/*` → show toast error.
  3. POST `FormData` to `/api/upload/avatar`.
  4. Show loading spinner on button during upload.
  5. On success: update local `avatarUrl` state → render `<AvatarImage src={avatarUrl}>`.
  6. On error: show toast with server error message.
- Page reads real session data (via `useSession`) instead of `currentUser` mock.

### Avatar display

When `avatarUrl` is set, render `<AvatarImage>` inside `<Avatar>`. Fall back to `<AvatarFallback>` (initials) if no URL.

---

## Validation

| Check | Where | Limit |
|-------|-------|-------|
| Auth session | Server | Required |
| File present | Server | Required |
| File type | Client + Server | `image/*` only |
| File size | Client + Server | 2MB max |

Client checks give instant feedback. Server checks are the security boundary.

---

## Error states

| Scenario | User-facing message |
|----------|---------------------|
| No file selected | (prevented by input flow) |
| File > 2MB | "File too large. Max 2MB." |
| Non-image type | "Only image files allowed." |
| Upload fails (Cloudinary error) | "Upload failed. Please try again." |
| Not authenticated | Redirect to login (handled by layout) |

---

## Out of scope (future)

- Chat image attachments
- Community post images
- Voice recording uploads
- Drag-and-drop / in-browser crop
- Progress bar for large files
