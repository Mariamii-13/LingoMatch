"use client"

import * as React from "react"
import { use } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, Flag, Loader2, Send, UserPlus, Video, WifiOff } from "lucide-react"
import { toast } from "sonner"

import { avatarGradient, cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useConversationThread, type Partner } from "./use-conversation-thread"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Modals ──────────────────────────────────────────────────────────────────

const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Inappropriate Content",
  "Fake Profile",
  "Other",
] as const

function ReportModal({
  partner,
  sessionId,
  onClose,
}: {
  partner: Partner
  sessionId: string
  onClose: () => void
}) {
  const [reason, setReason] = React.useState("")
  const [details, setDetails] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState(false)

  async function handleSubmit() {
    if (!reason) return
    setBusy(true)
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId: partner.id,
          conversationId: sessionId,
          reason,
          details,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Failed to submit report")
        return
      }
      setDone(true)
      setTimeout(onClose, 1800)
    } catch {
      toast.error("Failed to submit report")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        {done ? (
          <div className="py-6 text-center">
            <p className="text-3xl">✓</p>
            <p className="mt-2 font-semibold">Report submitted</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Our moderation team will review it shortly.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Report User</h2>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Reporting{" "}
              <span className="font-medium text-foreground">{partner.name}</span>
            </p>

            <div className="mt-4 space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                    reason === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)"
              maxLength={500}
              rows={2}
              className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
            />

            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-rose-600 text-white hover:bg-rose-700"
                disabled={!reason || busy}
                onClick={handleSubmit}
              >
                {busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Submit Report
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function FeedbackModal({
  onSubmit,
  onSkip,
}: {
  onSubmit: (
    rating: number,
    wouldTalkAgain: boolean,
    note: string
  ) => Promise<void>
  onSkip: () => void
}) {
  const [rating, setRating] = React.useState(0)
  const [wouldTalkAgain, setWouldTalkAgain] = React.useState<boolean | null>(
    null
  )
  const [note, setNote] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const canSubmit = rating > 0 && wouldTalkAgain !== null && !busy

  async function handleSubmit() {
    if (!canSubmit) return
    setBusy(true)
    await onSubmit(rating, wouldTalkAgain!, note)
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold">How was this conversation?</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your feedback improves future matches.
        </p>

        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={cn(
                "text-3xl transition-transform hover:scale-110",
                star <= rating
                  ? "text-amber-400"
                  : "text-muted-foreground/25 hover:text-amber-300"
              )}
            >
              ★
            </button>
          ))}
        </div>

        <p className="mt-5 text-sm font-medium">
          Would you talk with this person again?
        </p>
        <div className="mt-2 flex gap-3">
          {(
            [
              {
                label: "Yes",
                value: true,
                active:
                  "border-emerald-500 bg-emerald-500/10 text-emerald-500",
              },
              {
                label: "No",
                value: false,
                active: "border-rose-500 bg-rose-500/10 text-rose-500",
              },
            ] as const
          ).map(({ label, value, active }) => (
            <button
              key={label}
              onClick={() => setWouldTalkAgain(value)}
              className={cn(
                "flex-1 rounded-xl border py-2 text-sm font-medium transition-colors",
                wouldTalkAgain === value ? active : "hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything else? (optional)"
          maxLength={500}
          rows={2}
          className="mt-4 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        />

        <div className="mt-4 flex flex-col gap-2">
          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Submit Feedback
          </Button>
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={onSkip}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  )
}

function PostChatModal({
  partner,
  onAddFriend,
  onDismiss,
}: {
  partner: Partner
  onAddFriend: () => Promise<void>
  onDismiss: () => void
}) {
  const [addBusy, setAddBusy] = React.useState(false)
  const [added, setAdded] = React.useState(false)

  async function handleAdd() {
    setAddBusy(true)
    await onAddFriend()
    setAdded(true)
    setAddBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl">
        <p className="text-2xl">👋</p>
        <h2 className="mt-2 text-lg font-semibold">Great conversation!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Would you like to stay in touch with {partner.name}?
        </p>

        <Avatar className="mx-auto mt-4 size-16">
          <AvatarFallback
            className={`bg-gradient-to-br ${partner.avatarColor} text-lg font-semibold text-white`}
          >
            {partner.avatarInitials}
          </AvatarFallback>
        </Avatar>
        <p className="mt-2 font-medium">{partner.name}</p>
        {partner.country && (
          <p className="text-xs text-muted-foreground">{partner.country}</p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {added ? (
            <Button variant="secondary" className="w-full" disabled>
              Friend request sent!
            </Button>
          ) : (
            <Button className="w-full" onClick={handleAdd} disabled={addBusy}>
              {addBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              Add Friend
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onDismiss}
          >
            Not Now
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Chat panel ───────────────────────────────────────────────────────────────

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = use(params)
  const { data: authSession } = useSession()
  const myId = authSession?.user?.id ?? ""

  const [inputValue, setInputValue] = React.useState("")
  const [showPostChat, setShowPostChat] = React.useState(false)
  const [showReport, setShowReport] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const nearBottomRef = React.useRef(true)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  const {
    partner,
    messages,
    sessionStatus,
    loading,
    fetchError,
    sending,
    hasMoreHistory,
    loadingOlder,
    showFeedback,
    setShowFeedback,
    realtimeStatus,
    reconnect,
    loadOlderMessages,
    sendMessage: sendThreadMessage,
    handleLeave,
    handleFeedbackSubmit: submitFeedback,
    handleAddFriend,
  } = useConversationThread(conversationId, scrollContainerRef)

  React.useEffect(() => {
    nearBottomRef.current = true
  }, [conversationId])

  React.useEffect(() => {
    if (nearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  async function handleSend() {
    const content = inputValue.trim()
    if (!content || sending) return

    setInputValue("")
    const ok = await sendThreadMessage(content)
    if (ok === false) setInputValue(content)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleFeedbackSubmit(
    rating: number,
    wouldTalkAgain: boolean,
    note: string
  ) {
    await submitFeedback(rating, wouldTalkAgain, note)
    setShowPostChat(true)
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (fetchError || !partner) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="font-semibold">Could not load this conversation</p>
        <Button variant="outline" nativeButton={false} render={<Link href="/match/chat" />}>
          Find a new partner
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        {/* Back button — mobile only */}
        <Button
          variant="ghost"
          size="icon-sm"
          nativeButton={false}
          render={<Link href="/messages" />}
          aria-label="Back to messages"
          className="sm:hidden"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <Avatar className="size-9 shrink-0">
          <AvatarFallback
            className={cn(
              "bg-gradient-to-br text-sm font-semibold text-white",
              avatarGradient(partner.username)
            )}
          >
            {partner.avatarInitials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{partner.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {partner.nativeLanguages.map((l) => `${l.flag} ${l.name}`).join(", ")}
            {partner.country ? ` · ${partner.country}` : ""}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          nativeButton={false}
          render={<Link href="/match/video" />}
        >
          <Video className="size-4" />
          <span className="hidden md:inline">Live practice</span>
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Report user"
          className="shrink-0 text-muted-foreground hover:text-rose-500"
          onClick={() => setShowReport(true)}
        >
          <Flag className="size-4" />
        </Button>

        {sessionStatus === "active" ? (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-destructive hover:text-destructive"
            onClick={handleLeave}
          >
            Leave
          </Button>
        ) : (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            Ended
          </span>
        )}
      </div>

      {realtimeStatus === "reconnecting" && (
        <div className="border-b bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-700">
          Reconnecting live messages…
        </div>
      )}
      {realtimeStatus === "disconnected" && (
        <div className="flex items-center justify-center gap-2 border-b bg-muted px-4 py-2 text-xs text-muted-foreground">
          <WifiOff className="size-3.5" /> Live updates disconnected. Messages will refresh periodically.
          <button className="font-medium text-primary hover:underline" onClick={reconnect}>Reconnect</button>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        onScroll={(event) => {
          const element = event.currentTarget
          nearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120
          if (element.scrollTop < 200) loadOlderMessages()
        }}
      >
        {hasMoreHistory && (
          <div className="mb-3 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              disabled={loadingOlder}
              onClick={loadOlderMessages}
            >
              {loadingOlder && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Load older messages
            </Button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              Say hello! Start the conversation in{" "}
              <strong>
                {partner.nativeLanguages[0]?.name ?? "their language"}
              </strong>
              .
            </p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg) => {
            const isMe = msg.senderId === myId
            return (
              <div
                key={msg.id}
                className={cn("flex", isMe ? "justify-end" : "justify-start")}
              >
                {!isMe && (
                  <Avatar className="mr-2 mt-1 size-7 shrink-0 self-end">
                    <AvatarFallback
                      className={`bg-gradient-to-br ${partner.avatarColor} text-xs font-semibold text-white`}
                    >
                      {partner.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[75%] space-y-1",
                    isMe && "items-end"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm",
                      isMe
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted"
                    )}
                  >
                    {msg.content}
                  </div>
                  <p className="px-1 text-[10px] text-muted-foreground">
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            )
          })}

        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {sessionStatus === "active" ? (
        <div className="shrink-0 border-t px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send)"
              rows={1}
              className="max-h-32 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
              style={{ height: "auto" }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = "auto"
                el.style.height = `${el.scrollHeight}px`
              }}
            />
            <Button
              size="icon"
              disabled={!inputValue.trim() || sending}
              onClick={handleSend}
              aria-label="Send"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t px-4 py-3 text-center text-sm text-muted-foreground">
          Chat session ended.{" "}
          <Link
            href="/match/chat"
            className="text-primary underline-offset-4 hover:underline"
          >
            Find a new partner
          </Link>
        </div>
      )}

      {showReport && partner && (
        <ReportModal
          partner={partner}
          sessionId={conversationId}
          onClose={() => setShowReport(false)}
        />
      )}

      {showFeedback && (
        <FeedbackModal
          onSubmit={handleFeedbackSubmit}
          onSkip={() => {
            setShowFeedback(false)
            setShowPostChat(true)
          }}
        />
      )}

      {showPostChat && partner && (
        <PostChatModal
          partner={partner}
          onAddFriend={handleAddFriend}
          onDismiss={() => setShowPostChat(false)}
        />
      )}
    </div>
  )
}
