export function canonicalConversationPath(conversationId: string): string {
  return `/messages/${encodeURIComponent(conversationId)}`
}
