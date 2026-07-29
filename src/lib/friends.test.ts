import { describe, it, expect } from 'vitest'
import { toFriendCard } from './friends'

describe('toFriendCard', () => {
  it('stringifies the ObjectId and keeps the public fields', () => {
    const card = toFriendCard({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      username: 'ana',
      displayName: 'Ana Ruiz',
      avatar: 'https://cdn.example/a.png',
      country: 'Spain',
      nativeLanguages: ['es'],
      learningLanguages: [{ code: 'en', level: 'b1' }],
    })

    expect(card).toEqual({
      id: '507f1f77bcf86cd799439011',
      username: 'ana',
      displayName: 'Ana Ruiz',
      avatar: 'https://cdn.example/a.png',
      country: 'Spain',
      nativeLanguages: ['es'],
      learningLanguages: [{ code: 'en', level: 'b1' }],
    })
  })

  it('defaults every optional field so nothing renders as undefined', () => {
    const card = toFriendCard({
      _id: { toString: () => 'abc' },
      username: 'newcomer',
      displayName: 'Newcomer',
    })

    expect(card.avatar).toBe('')
    expect(card.country).toBe('')
    expect(card.nativeLanguages).toEqual([])
    expect(card.learningLanguages).toEqual([])
  })

  it('treats an empty-string country as absent', () => {
    const card = toFriendCard({
      _id: { toString: () => 'abc' },
      username: 'u',
      displayName: 'U',
      country: '',
    })

    expect(card.country).toBe('')
  })
})
