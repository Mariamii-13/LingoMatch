import { z } from 'zod'
import { PRACTICE_MODES } from '@/config/ai-practice'
import { isSupportedLanguageCode, normalizeLanguageCode } from '@/lib/language-profile'

const MAX_MESSAGE_LENGTH = 1000
const MAX_HISTORY_MESSAGES = 20
const MAX_HISTORY_MESSAGE_LENGTH = 500

export const historyMessageSchema = z.object({
  role: z.enum(['user', 'assistant'] as [string, ...string[]]).refine(
    (r) => r === 'user' || r === 'assistant',
    { message: 'History role must be "user" or "assistant"' },
  ),
  content: z.string().max(MAX_HISTORY_MESSAGE_LENGTH),
})

export const aiPracticeRequestSchema = z
  .object({
    action: z.enum(['start', 'message'] as [string, ...string[]]),
    targetLanguageCode: z
      .string()
      .trim()
      .transform(normalizeLanguageCode)
      .refine(isSupportedLanguageCode, { message: 'Unsupported target language' }),
    mode: z.enum(PRACTICE_MODES as unknown as [string, ...string[]]),
    history: z.array(historyMessageSchema).max(MAX_HISTORY_MESSAGES).optional().default([]),
    message: z.string().trim().max(MAX_MESSAGE_LENGTH).optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'message') {
        return typeof data.message === 'string' && data.message.trim().length > 0
      }
      return true
    },
    { message: 'message is required for action "message"', path: ['message'] },
  )

export type AIPracticeRequest = z.infer<typeof aiPracticeRequestSchema>
