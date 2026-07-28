import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { migrateLegacyLevel } from '@/constants/languages'
import {
  buildLanguageProfileUpdate,
  isLanguageProfileComplete,
  resolveLanguageProfile,
} from '@/lib/language-profile'

function applyMigrations(raw: Record<string, unknown>): Record<string, unknown> {
  // Synthesize spokenLanguages from legacy nativeLanguages if not yet migrated
  if (
    !(raw.spokenLanguages as unknown[])?.length &&
    (raw.nativeLanguages as string[])?.length
  ) {
    raw.spokenLanguages = (raw.nativeLanguages as string[]).map((code) => ({
      code,
      level: 'native',
    }))
  }
  // Collapse any CEFR spoken levels to "other" (spoken section no longer uses CEFR)
  if ((raw.spokenLanguages as unknown[])?.length) {
    raw.spokenLanguages = (raw.spokenLanguages as { code: string; level: string }[]).map(
      (l) => ({ ...l, level: l.level === 'native' ? 'native' : 'other' })
    )
  }
  // Normalise old Beginner/Intermediate/Advanced levels to CEFR
  if ((raw.learningLanguages as unknown[])?.length) {
    raw.learningLanguages = (
      raw.learningLanguages as { code: string; level: string }[]
    ).map((l) => ({ ...l, level: migrateLegacyLevel(l.level) }))
  }
  return raw
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const user = await User.findById(session.user.id).select('-passwordHash').lean()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const raw = user as Record<string, unknown>
  const profile = resolveLanguageProfile(raw)
  if (isLanguageProfileComplete(profile)) {
    raw.languageProfile = profile
    if (!user.languageProfile) {
      const update = buildLanguageProfileUpdate(
        profile,
        (raw.spokenLanguages as { code: string; level: string }[]) ?? [],
        profile.completedAt,
      )
      await User.updateOne({ _id: session.user.id, languageProfile: null }, { $set: update })
    }
  }

  return NextResponse.json(applyMigrations(raw))
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const legacyLanguageFields = ['nativeLanguages', 'spokenLanguages', 'learningLanguages']
  if (legacyLanguageFields.some((field) => field in body)) {
    return NextResponse.json(
      { error: 'Use /api/user/me/language-profile to update languages' },
      { status: 400 },
    )
  }
  const allowed = [
    'displayName',
    'bio',
    'country',
    'gender',
    'age',
    'timezone',
    'avatar',
    'interests',
    'conversationModes',
    'onboardingCompleted',
    'aiProfile',
  ]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  await connectDB()

  if ('username' in body) {
    const uname = (body.username as string)?.trim().toLowerCase()
    if (uname) {
      const taken = await User.findOne({ username: uname, _id: { $ne: session.user.id } }).lean()
      if (taken) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
      update.username = uname
    }
  }

  const user = await User.findByIdAndUpdate(session.user.id, update, {
    returnDocument: 'after',
  })
    .select('-passwordHash')
    .lean()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json(applyMigrations(user as Record<string, unknown>))
}
