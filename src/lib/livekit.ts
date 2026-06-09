import { AccessToken, RoomServiceClient } from 'livekit-server-sdk'

const apiKey = process.env.LIVEKIT_API_KEY!
const apiSecret = process.env.LIVEKIT_API_SECRET!
const livekitUrl = process.env.LIVEKIT_URL!

// Strip protocol for RoomServiceClient (needs https://)
function httpUrl(wsUrl: string): string {
  return wsUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://')
}

export function getRoomService(): RoomServiceClient {
  return new RoomServiceClient(httpUrl(livekitUrl), apiKey, apiSecret)
}

export async function createRoom(roomName: string): Promise<void> {
  const svc = getRoomService()
  await svc.createRoom({ name: roomName, emptyTimeout: 300, maxParticipants: 2 })
}

export async function generateToken(opts: {
  identity: string
  name: string
  roomName: string
  ttl?: number
}): Promise<string> {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: opts.identity,
    name: opts.name,
    ttl: opts.ttl ?? 3600,
  })
  at.addGrant({
    roomJoin: true,
    room: opts.roomName,
    canPublish: true,
    canSubscribe: true,
  })
  return at.toJwt()
}
