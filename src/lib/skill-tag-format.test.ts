import { describe, it, expect } from 'vitest'
import { formatSkillTag } from './skill-tag-format'

describe('formatSkillTag', () => {
  it('replaces hyphens with spaces and capitalises the first letter', () => {
    expect(formatSkillTag('preterite-vs-present')).toBe('Preterite vs present')
  })

  it('capitalises a single word with no hyphens', () => {
    expect(formatSkillTag('gender')).toBe('Gender')
  })
})
