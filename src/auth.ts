import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        await connectDB()
        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase(),
        })
        if (!user || !user.passwordHash) return null

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
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await connectDB()
        const existing = await User.findOne({ email: user.email })

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
            displayName: user.name,
            avatar: user.image ?? existing.avatar,
          })
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (account?.provider === 'google') {
        await connectDB()
        const dbUser = await User.findOne({ email: token.email })
        if (dbUser) {
          token.id = dbUser._id.toString()
          token.name = dbUser.displayName
          token.username = dbUser.username
          token.plan = dbUser.plan
          token.role = dbUser.role
          token.onboardingCompleted = dbUser.onboardingCompleted
        }
      } else if (user) {
        token.id = user.id
        token.username = (user as { username?: string }).username
        token.plan = (user as { plan?: string }).plan
        token.role = (user as { role?: string }).role
        token.onboardingCompleted = (
          user as { onboardingCompleted?: boolean }
        ).onboardingCompleted
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        ;(session.user as { username?: string }).username = token.username as string
        ;(session.user as { plan?: string }).plan = token.plan as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { onboardingCompleted?: boolean }).onboardingCompleted =
          token.onboardingCompleted as boolean
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
