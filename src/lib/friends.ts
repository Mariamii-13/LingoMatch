/**
 * The shape the friends UI renders. Deliberately narrower than the user
 * document: everything here is already public on a profile page, so the same
 * object is safe to serve from the API route and to hand to a Client Component.
 */
export type FriendCard = {
  id: string
  username: string
  displayName: string
  avatar: string
  country: string
  nativeLanguages: string[]
  learningLanguages: { code: string; level: string }[]
}

export type FriendLists = {
  friends: FriendCard[]
  incoming: FriendCard[]
  sent: FriendCard[]
}

/** A populated user document, as far as this mapping cares. */
export type PopulatedFriend = {
  _id: { toString(): string }
  username: string
  displayName: string
  avatar?: string
  country?: string
  nativeLanguages?: string[]
  learningLanguages?: { code: string; level: string }[]
}

/**
 * Mongo document → card.
 *
 * Every optional field is defaulted rather than passed through: the page renders
 * these directly, and an absent `country` used to reach the client as
 * `undefined` and print as "undefined" beside the username.
 */
export function toFriendCard(user: PopulatedFriend): FriendCard {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar || '',
    country: user.country || '',
    nativeLanguages: user.nativeLanguages || [],
    learningLanguages: user.learningLanguages || [],
  }
}
