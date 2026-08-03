import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { allowLoginAttempt } from '@/lib/auth-throttle'
import { getClientIp } from '@/lib/request-identity'
import {
  buildLanguageProfileUpdate,
  isLanguageProfileComplete,
  resolveLanguageProfile,
} from '@/lib/language-profile'

async function resolveLanguageProfileCompletion(
  userId: string,
  rawUser: Record<string, unknown>,
): Promise<boolean> {
  const profile = resolveLanguageProfile(rawUser)
  const complete = isLanguageProfileComplete(profile)
  if (complete && !rawUser.languageProfile) {
    const update = buildLanguageProfileUpdate(
      profile,
      (rawUser.spokenLanguages as { code: string; level: string }[]) ?? [],
      profile.completedAt,
    )
    await User.updateOne({ _id: userId, languageProfile: null }, { $set: update })
  }
  return complete
}

async function generateUniqueUsername(email: string): Promise<string> {
  const base = email
    .split('@')[0]
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase()
    .slice(0, 20) || 'user'

  const exists = await User.findOne({ username: base })
  if (!exists) return base

  for (let i = 0; i < 10; i++) {
    const candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`
    const taken = await User.findOne({ username: candidate })
    if (!taken) return candidate
  }
  return `${base}${Date.now().toString().slice(-6)}`
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        const email = (credentials.email as string).toLowerCase()

        /*
         * Throttled before the password is compared. bcrypt costs about a
         * quarter-second of CPU per attempt by design, so an unlimited endpoint
         * is both a brute-force oracle and a cheap way to saturate the server.
         * Credentials sign-in cannot return a custom message, so exceeding the
         * limit fails the attempt like any bad password.
         */
        const ip = getClientIp(new Headers(request?.headers ?? {}))
        if (!(await allowLoginAttempt(email, ip))) return null

        await connectDB()
        const user = await User.findOne({ email })
        if (!user || !user.passwordHash) return null
        if (user.isBanned) return null

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!passwordMatch) return null

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.displayName,
          username: user.username,
          plan: user.plan,
          role: user.role,
          onboardingCompleted: user.onboardingCompleted,
          languageProfileComplete: isLanguageProfileComplete(resolveLanguageProfile(user)),
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await connectDB()
        const existing = await User.findOne({ email: user.email })

        if (existing?.isBanned) return false

        if (!existing) {
          const username = await generateUniqueUsername(user.email!)
          await User.create({
            email: user.email,
            displayName: user.name,
            username,
            googleId: account.providerAccountId,
            avatar: user.image ?? '',
            isVerified: true,
            passwordHash: null,
          })
        } else if (!existing.googleId) {
          await User.findByIdAndUpdate(existing._id, {
            googleId: account.providerAccountId,
          })
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' || user) {
        await connectDB()
        const dbUser = await User.findOne({ email: token.email })
        if (dbUser) {
          const rawUser = dbUser.toObject() as Record<string, unknown>
          token.id = dbUser._id.toString()
          token.username = dbUser.username
          token.plan = dbUser.plan
          token.role = dbUser.role
          token.isBanned = dbUser.isBanned
          token.onboardingCompleted = dbUser.onboardingCompleted
          token.languageProfileComplete = await resolveLanguageProfileCompletion(
            dbUser._id.toString(),
            rawUser,
          )
          if (dbUser.displayName) token.name = dbUser.displayName
        }
      } else if (token.id) {
        /*
         * Re-reads MongoDB on every single request under the JWT session
         * strategy. This used to be throttled to a 5-minute interval
         * (roadmap #20) to save one query per page load, trading away
         * immediate ban propagation — a banned user's existing session could
         * keep acting for up to 5 minutes. Worse, in the throttled version
         * `isBanned` was fetched but never actually enforced anywhere, so a
         * ban never took effect on an existing session at all until the JWT
         * itself expired. Per an explicit product decision (PROJECT_PASSPORT.md
         * roadmap #20): moderation correctness outranks saving a database
         * read, so this now always re-checks and `proxy.ts` enforces
         * `token.isBanned` on every request.
         */
        await connectDB()
        const dbUser = await User.findById(token.id)
          .select('role plan isBanned onboardingCompleted displayName languageProfile nativeLanguages spokenLanguages learningLanguages')
          .lean() as Record<string, unknown> | null
        if (dbUser) {
          token.role = dbUser.role as string
          token.plan = dbUser.plan as string
          token.isBanned = dbUser.isBanned as boolean
          token.onboardingCompleted = dbUser.onboardingCompleted as boolean
          token.languageProfileComplete = await resolveLanguageProfileCompletion(
            token.id as string,
            dbUser,
          )
          if (dbUser.displayName) token.name = dbUser.displayName as string
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        ;(session.user as { username?: string }).username = token.username as string
        ;(session.user as { plan?: string }).plan = token.plan as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { isBanned?: boolean }).isBanned = token.isBanned as boolean
        ;(session.user as { onboardingCompleted?: boolean }).onboardingCompleted =
          token.onboardingCompleted as boolean
        ;(session.user as { languageProfileComplete?: boolean }).languageProfileComplete =
          token.languageProfileComplete as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
})
