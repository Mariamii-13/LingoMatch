"use client"

import * as React from "react"
import { use } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { ArrowLeft, Loader2, Send, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { avatarGradient, cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface Partner {
  id: string
  name: string
  username: string
  country: string
  avatarInitials: string
  avatarColor: string
  nativeLanguages: { code: string; name: string; flag: string }[]
}

interface ChatMessage {
  id: string
  senderId: string
  content: string
  createdAt: string
}

type SessionStatus = "active" | "ended"

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
          <AvatarFallback className={`bg-gradient-to-br ${partner.avatarColor} text-lg font-semibold text-white`}>
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
              {addBusy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Add Friend
            </Button>
          )}
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onDismiss}>
            Not Now
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId } = use(params)
  const { data: authSession } = useSession()
  const myId = authSession?.user?.id ?? ""

  const [partner, setPartner] = React.useState<Partner | null>(null)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [sessionStatus, setSessionStatus] = React.useState<SessionStatus>("active")
  const [loading, setLoading] = React.useState(true)
  const [fetchError, setFetchError] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [partnerTyping, setPartnerTyping] = React.useState(false)
  const [showPostChat, setShowPostChat] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMessageTimeRef = React.useRef<string | null>(null)
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, partnerTyping])

  // Load session info + initial messages
  React.useEffect(() => {
    async function init() {
      try {
        const [infoRes, msgRes] = await Promise.all([
          fetch(`/api/chat/${sessionId}`),
          fetch(`/api/chat/${sessionId}/messages`),
        ])

        if (!infoRes.ok || !msgRes.ok) { setFetchError(true); return }

        const info = await infoRes.json()
        const msgData = await msgRes.json()

        setPartner(info.partner)
        setSessionStatus(info.status)
        setMessages(msgData.messages)
        setPartnerTyping(msgData.partnerTyping)

        if (msgData.messages.length > 0) {
          lastMessageTimeRef.current = msgData.messages.at(-1)!.createdAt
        }

        if (info.status === "ended") setShowPostChat(true)
      } catch {
        setFetchError(true)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [sessionId])

  // Poll for new messages
  React.useEffect(() => {
    if (sessionStatus !== "active") return

    pollRef.current = setInterval(async () => {
      const after = lastMessageTimeRef.current ?? ""
      const res = await fetch(
        `/api/chat/${sessionId}/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`
      ).catch(() => null)
      if (!res?.ok) return

      const data = await res.json()
      setPartnerTyping(data.partnerTyping)

      if (data.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id))
          const fresh = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id))
          return fresh.length > 0 ? [...prev, ...fresh] : prev
        })
        lastMessageTimeRef.current = data.messages.at(-1).createdAt
      }

      if (data.sessionStatus === "ended") {
        clearInterval(pollRef.current!)
        setSessionStatus("ended")
        setShowPostChat(true)
      }
    }, 2000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [sessionId, sessionStatus])

  async function sendMessage() {
    const content = inputValue.trim()
    if (!content || sending || sessionStatus !== "active") return

    setSending(true)
    setInputValue("")
    try {
      const res = await fetch(`/api/chat/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error === "Session ended" ? "Chat session has ended" : "Failed to send")
        setInputValue(content)
        return
      }
      const msg = await res.json()
      setMessages((prev) => [...prev, msg])
      lastMessageTimeRef.current = msg.createdAt
    } catch {
      toast.error("Failed to send message")
      setInputValue(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value)
    // Debounced typing indicator
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      fetch(`/api/chat/${sessionId}/typing`, { method: "POST" }).catch(() => {})
    }, 300)
  }

  async function handleLeave() {
    if (pollRef.current) clearInterval(pollRef.current)
    await fetch(`/api/chat/${sessionId}/leave`, { method: "POST" }).catch(() => {})
    setSessionStatus("ended")
    setShowPostChat(true)
  }

  async function handleAddFriend() {
    if (!partner) return
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: partner.id }),
    })
    if (res.ok) toast.success("Friend request sent!")
    else toast.error("Could not send request")
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (fetchError || !partner) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-lg font-semibold">Could not load chat session</p>
        <Button variant="outline" render={<Link href="/match/chat" />}>
          Find a new partner
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm lg:h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/match/chat" />}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <Avatar className="size-9">
          <AvatarFallback
            className={cn("bg-gradient-to-br text-sm font-semibold text-white", avatarGradient(partner.username))}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-muted-foreground">
              Say hello! Start the conversation in {" "}
              <strong>{partner.nativeLanguages[0]?.name ?? "their language"}</strong>.
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
                <div className={cn("max-w-[75%] space-y-1", isMe && "items-end")}>
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

          {partnerTyping && (
            <div className="flex justify-start">
              <Avatar className="mr-2 mt-1 size-7 shrink-0">
                <AvatarFallback
                  className={`bg-gradient-to-br ${partner.avatarColor} text-xs font-semibold text-white`}
                >
                  {partner.avatarInitials}
                </AvatarFallback>
              </Avatar>
              <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                <span className="flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
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
              onChange={handleInputChange}
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
              onClick={sendMessage}
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
          <Link href="/match/chat" className="text-primary underline-offset-4 hover:underline">
            Find a new partner
          </Link>
        </div>
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
