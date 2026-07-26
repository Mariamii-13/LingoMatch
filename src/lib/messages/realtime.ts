import { DataPacket_Kind } from "livekit-server-sdk"

import { getRoomService } from "@/lib/livekit"
import {
  CONVERSATION_MESSAGE_TOPIC,
  type CanonicalMessage,
  type ConversationMessageEvent,
} from "@/lib/messages/reconcile"

export function userRealtimeRoom(userId: string): string {
  return `lm-user-${userId}`
}

export async function publishConversationMessage(
  participantIds: string[],
  message: CanonicalMessage
): Promise<void> {
  const event: ConversationMessageEvent = {
    type: "conversation.message",
    conversationId: message.conversationId,
    message,
  }
  const payload = new TextEncoder().encode(JSON.stringify(event))
  const roomService = getRoomService()

  await Promise.allSettled(
    participantIds.map((participantId) =>
      roomService.sendData(
        userRealtimeRoom(participantId),
        payload,
        DataPacket_Kind.RELIABLE,
        { topic: CONVERSATION_MESSAGE_TOPIC }
      )
    )
  )
}
