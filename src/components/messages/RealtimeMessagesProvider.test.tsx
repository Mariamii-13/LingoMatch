import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, waitFor } from "@testing-library/react"
import * as React from "react"

import { RealtimeMessagesProvider, useRealtimeMessages } from "./RealtimeMessagesProvider"
import { CONVERSATION_MESSAGE_TOPIC } from "@/lib/messages/reconcile"

/*
 * livekit-client is now loaded via a dynamic `import()` inside the effect
 * (roadmap #12 — it was the single largest client chunk in the app, ~490KB,
 * even though this provider only ever uses its text data channel). vi.mock
 * intercepts dynamic imports the same way it intercepts static ones, so this
 * suite exercises the real wiring: room construction, event registration,
 * connect/disconnect, and message dispatch.
 */
const RoomEvent = {
  DataReceived: "dataReceived",
  Reconnecting: "reconnecting",
  Reconnected: "reconnected",
  Disconnected: "disconnected",
} as const

class MockRoom {
  static instances: MockRoom[] = []
  handlers = new Map<string, (...args: unknown[]) => void>()
  connect = vi.fn(async () => {})
  disconnect = vi.fn()

  constructor(public options: unknown) {
    MockRoom.instances.push(this)
  }

  on(event: string, handler: (...args: unknown[]) => void) {
    this.handlers.set(event, handler)
    return this
  }

  emit(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.(...args)
  }
}

vi.mock("livekit-client", () => ({
  get Room() {
    return MockRoom
  },
  get RoomEvent() {
    return RoomEvent
  },
}))

function Probe({ onReady }: { onReady: (ctx: ReturnType<typeof useRealtimeMessages>) => void }) {
  const ctx = useRealtimeMessages()
  React.useEffect(() => {
    onReady(ctx)
  }, [ctx, onReady])
  return null
}

function dataPayload(event: unknown) {
  return new TextEncoder().encode(JSON.stringify(event))
}

beforeEach(() => {
  MockRoom.instances = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ serverUrl: "wss://example.livekit.cloud", token: "tok" }),
    }))
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("RealtimeMessagesProvider", () => {
  it("fetches a token and connects a room with the expected options", async () => {
    render(
      <RealtimeMessagesProvider>
        <Probe onReady={() => {}} />
      </RealtimeMessagesProvider>
    )

    await waitFor(() => expect(MockRoom.instances).toHaveLength(1))
    expect(MockRoom.instances[0].options).toEqual({ adaptiveStream: false, dynacast: false })
    expect(fetch).toHaveBeenCalledWith("/api/realtime/token", { cache: "no-store" })
    await waitFor(() =>
      expect(MockRoom.instances[0].connect).toHaveBeenCalledWith(
        "wss://example.livekit.cloud",
        "tok",
        { autoSubscribe: false }
      )
    )
  })

  it("reports connected status once the room connects", async () => {
    let latest: ReturnType<typeof useRealtimeMessages> | null = null
    render(
      <RealtimeMessagesProvider>
        <Probe onReady={(ctx) => (latest = ctx)} />
      </RealtimeMessagesProvider>
    )

    await waitFor(() => expect(latest?.status).toBe("connected"))
  })

  it("dispatches a conversation.message event received on the matching topic", async () => {
    let latest: ReturnType<typeof useRealtimeMessages> | null = null
    render(
      <RealtimeMessagesProvider>
        <Probe onReady={(ctx) => (latest = ctx)} />
      </RealtimeMessagesProvider>
    )
    await waitFor(() => expect(MockRoom.instances).toHaveLength(1))

    const received: unknown[] = []
    latest!.subscribe((event) => received.push(event))

    const event = {
      type: "conversation.message",
      conversationId: "c1",
      message: { id: "m1", conversationId: "c1", senderId: "u1", content: "hi", createdAt: "2026-01-01T00:00:00.000Z" },
    }
    MockRoom.instances[0].emit(RoomEvent.DataReceived, dataPayload(event), null, null, CONVERSATION_MESSAGE_TOPIC)

    expect(received).toEqual([event])
  })

  it("ignores data received on a different topic", async () => {
    let latest: ReturnType<typeof useRealtimeMessages> | null = null
    render(
      <RealtimeMessagesProvider>
        <Probe onReady={(ctx) => (latest = ctx)} />
      </RealtimeMessagesProvider>
    )
    await waitFor(() => expect(MockRoom.instances).toHaveLength(1))

    const received: unknown[] = []
    latest!.subscribe((event) => received.push(event))

    const event = { type: "conversation.message", conversationId: "c1", message: {} }
    MockRoom.instances[0].emit(RoomEvent.DataReceived, dataPayload(event), null, null, "some-other-topic")

    expect(received).toEqual([])
  })

  it("reports disconnected status if the token fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })))
    let latest: ReturnType<typeof useRealtimeMessages> | null = null
    render(
      <RealtimeMessagesProvider>
        <Probe onReady={(ctx) => (latest = ctx)} />
      </RealtimeMessagesProvider>
    )

    await waitFor(() => expect(latest?.status).toBe("disconnected"))
  })

  it("disconnects the room on unmount", async () => {
    const view = render(
      <RealtimeMessagesProvider>
        <Probe onReady={() => {}} />
      </RealtimeMessagesProvider>
    )
    await waitFor(() => expect(MockRoom.instances).toHaveLength(1))
    const room = MockRoom.instances[0]

    view.unmount()
    expect(room.disconnect).toHaveBeenCalledOnce()
  })
})
