import { z } from 'zod'

export const RegisterSchema = z.object({
  displayName: z
    .string({ error: (i) => i.input === undefined ? 'Display name is required' : 'Display name must be a string' })
    .min(2, { error: 'Display name must be at least 2 characters' })
    .max(50, { error: 'Display name must be at most 50 characters' }),
  email: z
    .string({ error: (i) => i.input === undefined ? 'Email is required' : 'Email must be a string' })
    .email({ error: 'Please enter a valid email address' }),
  username: z
    .string({ error: (i) => i.input === undefined ? 'Username is required' : 'Username must be a string' })
    .min(3, { error: 'Username must be at least 3 characters' })
    .max(20, { error: 'Username must be at most 20 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, { error: 'Username may only contain letters, numbers, and underscores' }),
  password: z
    .string({ error: (i) => i.input === undefined ? 'Password is required' : 'Password must be a string' })
    .min(8, { error: 'Password must be at least 8 characters' })
    .max(100, { error: 'Password must be at most 100 characters' }),
  // Roadmap #33: the inviter's username, carried from a shared invite link.
  // Optional and unauthenticated-input, so it is validated shape-only here —
  // applyReferral() looks it up and silently no-ops if it doesn't resolve to
  // a real account, rather than trusting it further at this boundary.
  ref: z
    .string()
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
})

export const LoginSchema = z.object({
  email: z
    .string({ error: (i) => i.input === undefined ? 'Email is required' : 'Email must be a string' })
    .email({ error: 'Please enter a valid email address' }),
  password: z.string({ error: (i) => i.input === undefined ? 'Password is required' : 'Password must be a string' }).min(1),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
