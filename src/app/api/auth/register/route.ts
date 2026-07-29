import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { RegisterSchema } from '@/lib/validations/auth'
import { allowRegistration } from '@/lib/auth-throttle'
import { getClientIp } from '@/lib/request-identity'
import { internalErrorResponse } from '@/lib/observability/report.server'

export async function POST(req: NextRequest) {
  try {
    // Checked before bcrypt runs, which is the expensive part of this handler.
    if (!(await allowRegistration(getClientIp(req.headers)))) {
      return NextResponse.json(
        { error: 'Too many accounts created from here. Please try again later.' },
        { status: 429 },
      )
    }

    const body = await req.json()
    const parsed = RegisterSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json(
        { error: issue?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }
    const { displayName, email, username, password } = parsed.data

    await connectDB()

    const existingEmail = await User.findOne({ email: email.toLowerCase() })
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const existingUsername = await User.findOne({ username: username.toLowerCase() })
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await User.create({
      displayName,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash,
    })

    return NextResponse.json(
      { message: 'Account created successfully', userId: user._id.toString() },
      { status: 201 }
    )
  } catch (error) {
    return internalErrorResponse('auth/register POST', error)
  }
}
