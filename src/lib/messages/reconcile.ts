export interface CanonicalMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
}

export interface ConversationMessageEvent {
  type: "conversation.message"
  conversationId: string
  message: CanonicalMessage
}

export const CONVERSATION_MESSAGE_TOPIC = "conversation.message"

interface ConversationPreview {
  id: string
  lastMessage?: {
    content: string
    createdAt: string
  } | null
}

export function reconcileMessages(
  current: CanonicalMessage[],
  incoming: CanonicalMessage[]
): CanonicalMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)

  return [...byId.values()].sort((a, b) => {
    const timeDifference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return timeDifference || a.id.localeCompare(b.id)
  })
}

export function applyMessageToConversations<T extends ConversationPreview>(
  conversations: T[],
  message: CanonicalMessage
): T[] {
  const updated = conversations.map((conversation) =>
    conversation.id === message.conversationId
      ? {
          ...conversation,
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
          },
        }
      : conversation
  )

  return updated.toSorted((a, b) => {
    const aTime = a.lastMessage?.createdAt ?? ""
    const bTime = b.lastMessage?.createdAt ?? ""
    return bTime.localeCompare(aTime)
  })
}

export function isConversationMessageEvent(value: unknown): value is ConversationMessageEvent {
  if (!value || typeof value !== "object") return false
  const event = value as Partial<ConversationMessageEvent>
  const message = event.message as Partial<CanonicalMessage> | undefined

  return (
    event.type === "conversation.message" &&
    typeof event.conversationId === "string" &&
    !!message &&
    typeof message.id === "string" &&
    message.conversationId === event.conversationId &&
    typeof message.senderId === "string" &&
    typeof message.content === "string" &&
    typeof message.createdAt === "string"
  )
}
