'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Bot, Send, RotateCcw, AlertCircle, Loader2, User, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  PRACTICE_MODES,
  MODE_DESCRIPTIONS,
  type PracticeMode,
} from '@/config/ai-practice'
import { formatLevel, getLanguage } from '@/constants/languages'
import type { LanguageProfileInput } from '@/lib/language-profile'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// crypto.randomUUID() only exists in secure contexts (https:, localhost,
// 127.0.0.1) — on a plain-HTTP LAN address (a projector, a second device on
// the network, an old browser) it is simply undefined, and calling it throws.
// These ids are only React keys and a client-side match for streamed deltas,
// never anything security-sensitive, so a non-cryptographic fallback is fine.
function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

type SessionSettings = {
  targetLanguageCode: string
  mode: PracticeMode
}

type ChatError = {
  message: string
  code?: string
  retryable: boolean
}

export type InitialTutorSession = {
  id: string
  targetLanguageCode: string
  mode: string
  messages: { role: 'user' | 'assistant'; content: string }[]
}

export function AIPracticeClient({
  profile,
  initialSession = null,
}: {
  profile: LanguageProfileInput
  initialSession?: InitialTutorSession | null
}) {
  const primaryTarget =
    profile.learningLanguages.find((language) => language.isPrimary) ??
    profile.learningLanguages[0]

  // An unfinished session resumes straight into the chat view; its language and
  // mode come from the stored session rather than the profile defaults.
  const [view, setView] = useState<'setup' | 'chat'>(initialSession ? 'chat' : 'setup')
  const [settings, setSettings] = useState<SessionSettings>({
    targetLanguageCode: initialSession?.targetLanguageCode ?? primaryTarget.code,
    mode: (initialSession?.mode as PracticeMode) ?? 'Free Conversation',
  })
  const [sessionId, setSessionId] = useState<string | null>(initialSession?.id ?? null)
  const [messages, setMessages] = useState<Message[]>(() =>
    (initialSession?.messages ?? []).map((message) => ({
      id: randomId(),
      role: message.role,
      content: message.content,
    })),
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ChatError | null>(null)
  const [input, setInput] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  // Screen readers get no signal at all while a reply streams in — the visible
  // text grows silently, and the one status region that exists (the loading
  // spinner) disappears the instant the first token arrives. This announces
  // once when a reply starts and once with the full text when it finishes,
  // rather than on every delta, which would read out each arriving fragment.
  const [announcement, setAnnouncement] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastReplyRef = useRef('')
  const selectedTarget =
    profile.learningLanguages.find(
      (language) => language.code === settings.targetLanguageCode,
    ) ?? primaryTarget
  const selectedLanguage = getLanguage(selectedTarget.code)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const doApiCall = useCallback(
    async (userMessage: string | null, isStart: boolean) => {
      // The server owns the transcript now, so a turn only needs the session id
      // and the new message — no history is sent from the browser.
      const body = isStart
        ? {
            action: 'start',
            targetLanguageCode: settings.targetLanguageCode,
            mode: settings.mode,
          }
        : {
            action: 'message',
            sessionId,
            message: userMessage,
          }

      let res: Response
      try {
        res = await fetch('/api/ai-practice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } catch {
        setError({ message: 'Network error. Check your connection and try again.', retryable: true })
        setIsLoading(false)
        return
      }

      // Failures before the reply begins still arrive as ordinary JSON errors.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as Record<string, unknown>)
        setError({
          message: (data.error as string) ?? 'Something went wrong. Please try again.',
          code: data.code as string | undefined,
          // The server knows when retrying cannot help — a spent daily
          // allowance will not recover for hours, so do not offer a Retry
          // button that is guaranteed to fail.
          retryable: (data.retryable as boolean) ?? (res.status !== 400 && res.status !== 401),
        })
        setIsLoading(false)
        return
      }

      if (!res.body) {
        setError({ message: 'Unexpected response from server.', retryable: true })
        setIsLoading(false)
        return
      }

      /*
       * The reply streams as newline-delimited JSON events. A placeholder
       * message is appended once and then grown in place, so the learner reads
       * the tutor's words as they arrive instead of waiting out the full
       * six-to-thirteen second reply behind a spinner.
       */
      const replyId = randomId()
      let started = false
      lastReplyRef.current = ''

      const appendDelta = (text: string) => {
        lastReplyRef.current += text
        if (!started) {
          started = true
          setIsLoading(false)
          setAnnouncement('Tutor is replying…')
          setMessages((prev) => [...prev, { id: replyId, role: 'assistant', content: text }])
          return
        }
        setMessages((prev) =>
          prev.map((message) =>
            message.id === replyId ? { ...message, content: message.content + text } : message,
          ),
        )
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const handleEvent = (line: string) => {
        const trimmed = line.trim()
        if (!trimmed) return
        let event: { type?: string; text?: string; sessionId?: string; error?: string; retryable?: boolean }
        try {
          event = JSON.parse(trimmed)
        } catch {
          return
        }
        if (event.type === 'session' && event.sessionId) setSessionId(event.sessionId)
        else if (event.type === 'delta' && event.text) appendDelta(event.text)
        else if (event.type === 'done') {
          if (lastReplyRef.current) setAnnouncement(`Tutor replied: ${lastReplyRef.current}`)
        } else if (event.type === 'error') {
          setError({
            message: event.error ?? 'The reply was cut short. Please try again.',
            retryable: event.retryable ?? true,
          })
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) handleEvent(line)
        }
        if (buffer) handleEvent(buffer)
      } catch {
        setError({ message: 'The connection dropped mid-reply. Please try again.', retryable: true })
      } finally {
        reader.releaseLock()
        setIsLoading(false)
      }
    },
    [settings, sessionId],
  )

  const startSession = useCallback(async () => {
    if (isLoading) return
    setView('chat')
    setMessages([])
    setSessionId(null)
    setError(null)
    setInput('')
    setIsLoading(true)
    await doApiCall(null, true)
  }, [isLoading, doApiCall])

  const sendMessage = useCallback(async () => {
    if (isLoading) return
    const content = input.trim()
    if (!content) return

    const userMsg: Message = { id: randomId(), role: 'user', content }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setError(null)
    setIsLoading(true)
    await doApiCall(content, false)
  }, [isLoading, input, doApiCall])

  const retryLast = useCallback(async () => {
    if (isLoading) return

    if (messages.length === 0) {
      await startSession()
      return
    }

    const last = messages[messages.length - 1]
    if (last.role !== 'user') return

    setError(null)
    setIsLoading(true)
    // Resend the turn that failed. It was never stored, because the server only
    // records an exchange once the provider has replied.
    await doApiCall(last.content, false)
  }, [isLoading, messages, startSession, doApiCall])

  const resetSession = useCallback(async () => {
    setShowResetConfirm(false)
    setView('setup')
    setMessages([])
    setError(null)
    setInput('')
    setSessionId(null)
    // The setup form's target-language <select> only ever offers options from
    // the current profile. Leaving `settings` at whatever the just-ended
    // session used breaks "Start Practice" the moment that language isn't one
    // of them (e.g. the learner removed it from their profile since) — the
    // <select> silently falls back to displaying its first option while the
    // stale, invalid code is still what actually gets submitted. Reset to a
    // language guaranteed to be valid right now.
    setSettings({ targetLanguageCode: primaryTarget.code, mode: 'Free Conversation' })
    // Close the stored session too, or the next page load would resume the
    // conversation the user just chose to leave.
    await fetch('/api/ai-practice', { method: 'DELETE' }).catch(() => {})
  }, [primaryTarget.code])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (view === 'setup') {
    return (
      <div className="max-w-lg space-y-8">
        <div>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Bot className="size-6" />
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">AI Conversation Practice</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a saved target language and what you want to practise. Your tutor will adapt to your profile automatically.
          </p>
        </div>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="language-select" className="text-sm font-medium">
              Target Language
            </label>
            <select
              id="language-select"
              aria-label="Target language"
              value={settings.targetLanguageCode}
              onChange={(e) =>
                setSettings((s) => ({ ...s, targetLanguageCode: e.target.value }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {profile.learningLanguages.map(({ code, level }) => (
                <option key={code} value={code}>
                  {getLanguage(code).name} · {formatLevel(level)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Current level</span>
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              {formatLevel(selectedTarget.level)}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mode-select" className="text-sm font-medium">
              Practice Mode
            </label>
            <select
              id="mode-select"
              aria-label="Practice mode"
              value={settings.mode}
              onChange={(e) =>
                setSettings((s) => ({ ...s, mode: e.target.value as PracticeMode }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {PRACTICE_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {MODE_DESCRIPTIONS[settings.mode]}
            </p>
          </div>
        </div>

        <Button onClick={startSession} className="w-full" size="lg">
          Start Practice
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] max-h-[700px] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm">{selectedLanguage.name}</span>
          <Badge variant="secondary">{formatLevel(selectedTarget.level)}</Badge>
          <Badge variant="outline">{settings.mode}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {showResetConfirm ? (
            <>
              <span className="text-xs text-muted-foreground">End session?</span>
              <Button size="sm" variant="destructive" onClick={resetSession}>
                Yes, end
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (messages.length > 0) {
                  setShowResetConfirm(true)
                } else {
                  resetSession()
                }
              }}
              aria-label="New session"
            >
              <PlusCircle className="mr-1.5 size-4" />
              New session
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !isLoading && !error && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Starting your session…
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
          >
            <div
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs',
                msg.role === 'assistant'
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {msg.role === 'assistant' ? (
                <Bot className="size-4" />
              ) : (
                <User className="size-4" />
              )}
            </div>
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'assistant'
                  ? 'bg-muted text-foreground rounded-tl-sm'
                  : 'bg-primary text-primary-foreground rounded-tr-sm',
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3" role="status" aria-label="Loading AI response">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bot className="size-4" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="flex-1 space-y-2">
              <p className="text-destructive">{error.message}</p>
              {error.retryable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={retryLast}
                  disabled={isLoading}
                >
                  <RotateCcw className="mr-1.5 size-3" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            aria-label="Your message"
            placeholder="Type your message… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[44px] max-h-[120px]',
            )}
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
            aria-label="Send message"
            className="shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
