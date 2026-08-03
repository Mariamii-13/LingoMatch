"use client"

import * as React from "react"
import type { Room as RoomInstance } from "livekit-client"

import {
  CONVERSATION_MESSAGE_TOPIC,
  isConversationMessageEvent,
  type ConversationMessageEvent,
} from "@/lib/messages/reconcile"

export type RealtimeStatus = "connecting" | "connected" | "reconnecting" | "disconnected"

interface RealtimeMessagesContextValue {
  status: RealtimeStatus
  reconnect: () => void
  subscribe: (listener: (event: ConversationMessageEvent) => void) => () => void
  dispatch: (event: ConversationMessageEvent) => void
}

const RealtimeMessagesContext = React.createContext<RealtimeMessagesContextValue | null>(null)

export function RealtimeMessagesProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<RealtimeStatus>("connecting")
  const [attempt, setAttempt] = React.useState(0)
  const listenersRef = React.useRef(new Set<(event: ConversationMessageEvent) => void>())
  const dispatch = React.useCallback((event: ConversationMessageEvent) => {
    listenersRef.current.forEach((listener) => listener(event))
  }, [])

  React.useEffect(() => {
    let active = true
    let room: RoomInstance | null = null

    /*
     * `livekit-client` is the single largest client chunk in the app
     * (~490KB, full WebRTC/media-track machinery) even though this provider
     * only ever uses it for a text data channel. Importing it dynamically
     * here keeps that weight out of the synchronous bundle for every page
     * that mounts MessengerShell, at the cost of one extra network round
     * trip before the realtime connection can start (the 10s polling
     * fallback already covers that gap).
     */
    async function connect() {
      try {
        const { Room, RoomEvent } = await import("livekit-client")
        if (!active) return
        room = new Room({ adaptiveStream: false, dynacast: false })

        room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
          if (topic !== CONVERSATION_MESSAGE_TOPIC) return
          try {
            const parsed = JSON.parse(new TextDecoder().decode(payload))
            if (active && isConversationMessageEvent(parsed)) {
              dispatch(parsed)
            }
          } catch {
            // Ignore malformed realtime packets; persisted messages remain available via the API.
          }
        })
        room.on(RoomEvent.Reconnecting, () => active && setStatus("reconnecting"))
        room.on(RoomEvent.Reconnected, () => active && setStatus("connected"))
        room.on(RoomEvent.Disconnected, () => active && setStatus("disconnected"))

        const response = await fetch("/api/realtime/token", { cache: "no-store" })
        if (!response.ok) throw new Error("Could not authorize realtime connection")
        const data = await response.json()
        await room.connect(data.serverUrl, data.token, { autoSubscribe: false })
        if (active) setStatus("connected")
      } catch {
        if (active) setStatus("disconnected")
      }
    }

    connect()
    return () => {
      active = false
      room?.disconnect()
    }
  }, [attempt, dispatch])

  const subscribe = React.useCallback((listener: (event: ConversationMessageEvent) => void) => {
    listenersRef.current.add(listener)
    return () => listenersRef.current.delete(listener)
  }, [])

  const value = React.useMemo(
    () => ({ status, reconnect: () => setAttempt((value) => value + 1), subscribe, dispatch }),
    [status, subscribe, dispatch]
  )

  return (
    <RealtimeMessagesContext.Provider value={value}>
      {children}
    </RealtimeMessagesContext.Provider>
  )
}

export function useRealtimeMessages(): RealtimeMessagesContextValue {
  const context = React.useContext(RealtimeMessagesContext)
  if (!context) throw new Error("useRealtimeMessages must be used within RealtimeMessagesProvider")
  return context
}
