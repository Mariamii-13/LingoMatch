import * as React from "react"
import { toast } from "sonner"

import { useRealtimeMessages } from "@/components/messages/RealtimeMessagesProvider"
import { reconcileMessages, type CanonicalMessage } from "@/lib/messages/reconcile"

export interface Partner {
  id: string
  name: string
  username: string
  country: string
  avatarInitials: string
  avatarColor: string
  lastSeenAt: string | null
  nativeLanguages: { code: string; name: string; flag: string }[]
}

export type ChatMessage = CanonicalMessage

export type SessionStatus = "active" | "ended"

/**
 * Owns every network- and realtime-shaped concern for a single conversation
 * thread: the initial load, live message delivery (realtime + polling
 * fallback), backwards pagination through history, and the actions that
 * mutate server state (send, leave, feedback, add friend). Split out of
 * page.tsx, which had grown to 774 lines mixing this with modal components
 * and JSX (roadmap #16) — relocated as-is, not rewritten.
 *
 * `scrollContainerRef` is owned by the caller (it's the JSX scroll div) but
 * `loadOlderMessages` needs it to preserve scroll position when prepending
 * older messages, so it's passed in rather than duplicated.
 */
export function useConversationThread(
  conversationId: string,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
) {
  const [partner, setPartner] = React.useState<Partner | null>(null)
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [sessionStatus, setSessionStatus] =
    React.useState<SessionStatus>("active")
  const [loading, setLoading] = React.useState(true)
  const [fetchError, setFetchError] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [hasMoreHistory, setHasMoreHistory] = React.useState(false)
  const [loadingOlder, setLoadingOlder] = React.useState(false)
  const [showFeedback, setShowFeedback] = React.useState(false)

  const { status: realtimeStatus, reconnect, subscribe, dispatch } = useRealtimeMessages()

  /** Cursor for incremental polling: the newest message currently held. */
  const latestMessageAtRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    latestMessageAtRef.current = messages.length
      ? messages[messages.length - 1].createdAt
      : null
  }, [messages])

  React.useEffect(() => {
    async function init() {
      try {
        const [infoRes, msgRes] = await Promise.all([
          fetch(`/api/chat/${conversationId}`),
          fetch(`/api/chat/${conversationId}/messages`),
        ])

        if (!infoRes.ok || !msgRes.ok) {
          setFetchError(true)
          return
        }

        const info = await infoRes.json()
        const msgData = await msgRes.json()

        setPartner(info.partner)
        setSessionStatus(info.status)
        setMessages(msgData.messages)
        // The initial fetch has no cursor, so the server can't yet say whether
        // older history exists — a full page is the signal to offer "load
        // older"; if none actually remains, the first before-fetch just
        // returns nothing and clears the flag.
        setHasMoreHistory(msgData.messages.length === 100)

        if (info.status === "ended") setShowFeedback(true)
      } catch {
        setFetchError(true)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [conversationId])

  React.useEffect(
    () =>
      subscribe((event) => {
        if (event.conversationId !== conversationId) return
        setMessages((current) => reconcileMessages(current, [event.message]))
      }),
    [conversationId, subscribe]
  )

  React.useEffect(() => {
    if (realtimeStatus !== "disconnected" || sessionStatus !== "active") return

    const interval = setInterval(async () => {
      // Ask only for what arrived since the newest message already held. This
      // endpoint has always supported the cursor; polling was refetching the
      // whole window every ten seconds without it.
      const newest = latestMessageAtRef.current
      const url = newest
        ? `/api/chat/${conversationId}/messages?after=${encodeURIComponent(newest)}`
        : `/api/chat/${conversationId}/messages`

      const response = await fetch(url, { cache: "no-store" }).catch(() => null)
      if (!response?.ok) return
      const data = await response.json()
      setMessages((current) => reconcileMessages(current, data.messages))
      if (data.sessionStatus === "ended") setSessionStatus("ended")
    }, 10_000)

    return () => clearInterval(interval)
  }, [conversationId, realtimeStatus, sessionStatus])

  const loadOlderMessages = React.useCallback(async () => {
    if (loadingOlder || !hasMoreHistory) return
    const oldest = messages[0]?.createdAt
    if (!oldest) return

    setLoadingOlder(true)
    const container = scrollContainerRef.current
    const prevScrollHeight = container?.scrollHeight ?? 0

    try {
      const response = await fetch(
        `/api/chat/${conversationId}/messages?before=${encodeURIComponent(oldest)}`,
        { cache: "no-store" }
      )
      if (!response.ok) return
      const data = await response.json()
      if (data.messages.length > 0) {
        setMessages((current) => reconcileMessages(current, data.messages))
        // Prepending changes scrollHeight without the user scrolling, which
        // would otherwise jerk the view. Restore the same visual position by
        // offsetting scrollTop by exactly what was added above it, once the
        // browser has laid out the new rows.
        requestAnimationFrame(() => {
          if (container) container.scrollTop += container.scrollHeight - prevScrollHeight
        })
      }
      setHasMoreHistory(Boolean(data.hasMore))
    } catch {
      // Leave hasMoreHistory as-is — a transient failure shouldn't hide the
      // "load older" affordance, just this one attempt.
    } finally {
      setLoadingOlder(false)
    }
  }, [conversationId, hasMoreHistory, loadingOlder, messages, scrollContainerRef])

  const sendMessage = React.useCallback(
    async (content: string) => {
      if (!content || sending || sessionStatus !== "active") return

      setSending(true)
      try {
        const res = await fetch(`/api/chat/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          if (res.status === 429) toast.error("Sending too fast — slow down a bit")
          else
            toast.error(
              err.error === "Session ended"
                ? "Chat session has ended"
                : "Failed to send"
            )
          return false
        }
        const msg = await res.json()
        dispatch({ type: "conversation.message", conversationId, message: msg })
        return true
      } catch {
        toast.error("Failed to send message")
        return false
      } finally {
        setSending(false)
      }
    },
    [conversationId, dispatch, sending, sessionStatus]
  )

  const handleLeave = React.useCallback(async () => {
    await fetch(`/api/chat/${conversationId}/leave`, {
      method: "POST",
    }).catch(() => {})
    setSessionStatus("ended")
    setShowFeedback(true)
  }, [conversationId])

  const handleFeedbackSubmit = React.useCallback(
    async (rating: number, wouldTalkAgain: boolean, note: string) => {
      try {
        await fetch(`/api/chat/${conversationId}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, wouldTalkAgain, note }),
        })
      } catch {
        // non-fatal
      }
      setShowFeedback(false)
    },
    [conversationId]
  )

  const handleAddFriend = React.useCallback(async () => {
    if (!partner) return
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: partner.id }),
    })
    if (res.ok) toast.success("Friend request sent!")
    else toast.error("Could not send request")
  }, [partner])

  return {
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
    sendMessage,
    handleLeave,
    handleFeedbackSubmit,
    handleAddFriend,
  }
}
