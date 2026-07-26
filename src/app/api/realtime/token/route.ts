import { randomUUID } from "node:crypto"
import { AccessToken } from "livekit-server-sdk"
import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { userRealtimeRoom } from "@/lib/messages/realtime"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const roomName = userRealtimeRoom(session.user.id)
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: `${session.user.id}:${randomUUID()}`,
      name: session.user.name ?? "User",
      ttl: 3600,
    }
  )

  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: false,
    canPublishData: false,
    canSubscribe: true,
  })

  return NextResponse.json({
    token: await token.toJwt(),
    serverUrl: process.env.LIVEKIT_URL,
  })
}
