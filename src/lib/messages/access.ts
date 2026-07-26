interface StringableId {
  toString(): string
}

export function isConversationParticipant(
  participants: StringableId[],
  userId: string
): boolean {
  return participants.some((participant) => participant.toString() === userId)
}
