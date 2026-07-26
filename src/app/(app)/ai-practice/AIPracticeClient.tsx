'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Bot, Send, RotateCcw, AlertCircle, Loader2, User, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  SUPPORTED_LANGUAGES,
  CEFR_LEVELS,
  PRACTICE_MODES,
  MODE_DESCRIPTIONS,
  LEVEL_LABELS,
  type SupportedLanguage,
  type CEFRLevel,
  type PracticeMode,
} from '@/config/ai-practice'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

type SessionSettings = {
  language: SupportedLanguage
  level: CEFRLevel
  mode: PracticeMode
}

type ChatError = {
  message: string
  code?: string
  retryable: boolean
}

export function AIPracticeClient() {
  const [view, setView] = useState<'setup' | 'chat'>('setup')
  const [settings, setSettings] = useState<SessionSettings>({
    language: 'English',
    level: 'B1',
    mode: 'Free Conversation',
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ChatError | null>(null)
  const [input, setInput] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const doApiCall = useCallback(
    async (currentMessages: Message[], isStart: boolean) => {
      const historyToSend = isStart
        ? []
        : currentMessages
            .slice(-21, isStart ? undefined : -1)
            .map((m) => ({ role: m.role, content: m.content }))

      const lastMsg = !isStart ? currentMessages[currentMessages.length - 1] : null

      const body = isStart
        ? { action: 'start', language: settings.language, level: settings.level, mode: settings.mode }
        : {
            action: 'message',
            language: settings.language,
            level: settings.level,
            mode: settings.mode,
            history: historyToSend,
            message: lastMsg!.content,
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

      let data: { reply?: string; error?: string; code?: string }
      try {
        data = await res.json()
      } catch {
        setError({ message: 'Unexpected response from server.', retryable: true })
        setIsLoading(false)
        return
      }

      if (!res.ok) {
        setError({
          message: data.error ?? 'Something went wrong. Please try again.',
          code: data.code,
          retryable: res.status !== 400 && res.status !== 401,
        })
        setIsLoading(false)
        return
      }

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply!,
      }
      setMessages((prev) => [...prev, aiMsg])
      setError(null)
      setIsLoading(false)
    },
    [settings],
  )

  const startSession = useCallback(async () => {
    if (isLoading) return
    setView('chat')
    setMessages([])
    setError(null)
    setInput('')
    setIsLoading(true)
    await doApiCall([], true)
  }, [isLoading, doApiCall])

  const sendMessage = useCallback(async () => {
    if (isLoading) return
    const content = input.trim()
    if (!content) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setError(null)
    setIsLoading(true)
    await doApiCall(next, false)
  }, [isLoading, input, messages, doApiCall])

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
    await doApiCall(messages, false)
  }, [isLoading, messages, startSession, doApiCall])

  const resetSession = useCallback(() => {
    setView('setup')
    setMessages([])
    setError(null)
    setInput('')
    setShowResetConfirm(false)
  }, [])

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
            Choose your language, level, and what you want to practise. Your tutor will guide you through a real conversation.
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
              value={settings.language}
              onChange={(e) =>
                setSettings((s) => ({ ...s, language: e.target.value as SupportedLanguage }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="level-select" className="text-sm font-medium">
              Your Level
            </label>
            <select
              id="level-select"
              aria-label="CEFR level"
              value={settings.level}
              onChange={(e) =>
                setSettings((s) => ({ ...s, level: e.target.value as CEFRLevel }))
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CEFR_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
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
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm">{settings.language}</span>
          <Badge variant="secondary">{settings.level}</Badge>
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
        {messages.length === 0 && !isLoading && (
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
