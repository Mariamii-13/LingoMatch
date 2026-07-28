import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { buildLanguageProfileUpdate } from '@/lib/language-profile'
import { getUserLanguageProfile } from '@/lib/language-profile.server'
import { languageProfileInputSchema } from '@/lib/validations/language-profile'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await getUserLanguageProfile(session.user.id)
    if (!result) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Language Profile] Failed to load:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Failed to load language profile' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = languageProfileInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid language profile', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    await connectDB()
    const user = await User.findById(session.user.id).select('spokenLanguages').lean() as {
      spokenLanguages?: { code: string; level: string }[]
    } | null
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const update = buildLanguageProfileUpdate(parsed.data, user.spokenLanguages ?? [])
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: update },
      { returnDocument: 'after', runValidators: true },
    ).select('_id')
    if (!updatedUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ profile: update.languageProfile, complete: true })
  } catch (error) {
    console.error('[Language Profile] Failed to save:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Failed to save language profile' }, { status: 500 })
  }
}
