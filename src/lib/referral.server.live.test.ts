/**
 * Controlled real-database check for roadmap #33 (invite-a-partner
 * referral flow, §20.3). Skipped by default. Run it deliberately:
 *   ($env:LIVE_AI_TESTS = '1'; npx vitest run src/lib/referral.server.live.test.ts)
 *
 * What this checks that the mocked unit tests cannot: whether Mongoose's
 * update actually persists `invitedBy` against the real schema and a real
 * document, in a fresh process — not a long-running dev server whose
 * in-memory `mongoose.models.User` may have been compiled from an older
 * version of the schema (a real gotcha this test exists specifically to
 * catch: `mongoose.models.User || mongoose.model(...)` reuses whatever
 * schema was first compiled in the process, and schema field *additions*
 * do not retroactively apply to an already-running process without a
 * restart — a plain mocked unit test, which never touches the real schema
 * object at all, cannot see this class of bug).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const LIVE = process.env.LIVE_AI_TESTS === '1'

describe.skipIf(!LIVE)('applyReferral against the real database', () => {
  let connectDB: typeof import('./db').connectDB
  let User: typeof import('./models/User').default
  let applyReferral: typeof import('./referral.server').applyReferral
  const createdIds: string[] = []

  beforeAll(async () => {
    const { readFileSync } = await import('node:fs')
    const lines = readFileSync(`${process.cwd()}/.env.local`, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 1) continue
      const key = trimmed.slice(0, eq)
      if (!process.env[key]) {
        process.env[key] = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '')
      }
    }
    ;({ connectDB } = await import('./db'))
    User = (await import('./models/User')).default
    ;({ applyReferral } = await import('./referral.server'))
    await connectDB()
  })

  afterAll(async () => {
    if (createdIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdIds } })
    }
  })

  it('actually persists invitedBy on the new user document, not just the friends arrays', async () => {
    const inviter = await User.create({
      displayName: 'Live Test Inviter',
      email: `live-inviter-${Date.now()}@lingomatch.test`,
      username: `liveinviter${Date.now()}`,
      passwordHash: 'x',
    })
    const invitee = await User.create({
      displayName: 'Live Test Invitee',
      email: `live-invitee-${Date.now()}@lingomatch.test`,
      username: `liveinvitee${Date.now()}`,
      passwordHash: 'x',
    })
    createdIds.push(inviter._id.toString(), invitee._id.toString())

    const result = await applyReferral(invitee._id.toString(), inviter.username)
    expect(result.applied).toBe(true)

    const freshInvitee = await User.findById(invitee._id).lean<{
      invitedBy: unknown
      friends: unknown[]
    }>()
    const freshInviter = await User.findById(inviter._id).lean<{ friends: unknown[] }>()

    expect(String(freshInvitee?.invitedBy)).toBe(inviter._id.toString())
    expect(freshInvitee?.friends.map(String)).toContain(inviter._id.toString())
    expect(freshInviter?.friends.map(String)).toContain(invitee._id.toString())
  })
})
