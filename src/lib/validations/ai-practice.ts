import { z } from 'zod'
import { PRACTICE_MODES } from '@/config/ai-practice'
import { isSupportedLanguageCode, normalizeLanguageCode } from '@/lib/language-profile'

const MAX_MESSAGE_LENGTH = 1000

const objectId = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Invalid session id')

/**
 * Starting a session needs the language and mode; continuing one needs only the
 * session id and the new message.
 *
 * The client no longer supplies conversation history. Sessions are persisted,
 * so the server reads the transcript it recorded instead of trusting the one the
 * caller claims — which also keeps request bodies small on long conversations.
 */
export const aiPracticeRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    targetLanguageCode: z
      .string()
      .trim()
      .transform(normalizeLanguageCode)
      .refine(isSupportedLanguageCode, { message: 'Unsupported target language' }),
    mode: z.enum(PRACTICE_MODES as unknown as [string, ...string[]]),
  }),
  z.object({
    action: z.literal('message'),
    sessionId: objectId,
    message: z
      .string()
      .trim()
      .min(1, 'message is required for action "message"')
      .max(MAX_MESSAGE_LENGTH),
  }),
])

export type AIPracticeRequest = z.infer<typeof aiPracticeRequestSchema>
