"use client"

import * as React from "react"
import { use } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, Flag, Loader2, Send, Video, WifiOff } from "lucide-react"

import { avatarGradient, cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ReportModal } from "@/components/messages/ReportModal"
import { FeedbackModal } from "@/components/messages/FeedbackModal"
import { PostChatModal } from "@/components/messages/PostChatModal"
import { useConversationThread } from "./use-conversation-thread"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
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
