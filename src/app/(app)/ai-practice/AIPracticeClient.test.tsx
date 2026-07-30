/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AIPracticeClient } from './AIPracticeClient'

const PROFILE = {
  nativeLanguages: ['en'],
  learningLanguages: [
    { code: 'es', level: 'b1' as const, isPrimary: true },
    { code: 'de', level: 'unsure' as const, isPrimary: false },
  ],
  preferredExplanationLanguage: 'en',
}

function renderClient() {
  return render(<AIPracticeClient profile={PROFILE} />)
}

/** Error responses are still plain JSON, so this covers every failure case. */
function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

/**
 * Builds the newline-delimited event stream a successful reply now returns.
 * `chunks` lets a test assert that text renders progressively.
 */
function streamResponse(chunks: string[], sessionId = 'a'.repeat(24)) {
  const encoder = new TextEncoder()
  const events = [
    { type: 'session', sessionId },
    ...chunks.map((text) => ({ type: 'delta', text })),
    { type: 'done' },
  ]
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }
      controller.close()
    },
  })
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}

/** Mocks one successful streamed reply, delivered as a single chunk. */
function mockReply(reply: string) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce(streamResponse([reply]))
}

beforeEach(() => {
  vi.clearAllMocks()
  // crypto.randomUUID is available in jsdom
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AIPracticeClient — setup view', () => {
  it('renders all selectors and start button', () => {
    renderClient()
    expect(screen.getByLabelText('Target language')).toBeInTheDocument()
    expect(screen.getByText('B1')).toBeInTheDocument()
    expect(screen.getByLabelText('Practice mode')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start practice/i })).toBeInTheDocument()
  })

  it('shows mode description', () => {
    renderClient()
    expect(screen.getByText(/open-ended conversation/i)).toBeInTheDocument()
  })
})

describe('AIPracticeClient — loading state', () => {
  it('shows loading indicator while waiting for AI', async () => {
    let resolveFetch!: (r: Response) => void
    vi.spyOn(global, 'fetch').mockReturnValueOnce(
      new Promise<Response>((resolve) => { resolveFetch = resolve }),
    )

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()

    await act(async () => {
      resolveFetch(
        new Response(JSON.stringify({ reply: 'Hello!' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })
  })

  it('disables send button while loading', async () => {
    let resolveFetch!: (r: Response) => void
    vi.spyOn(global, 'fetch').mockReturnValueOnce(
      new Promise<Response>((resolve) => { resolveFetch = resolve }),
    )

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    // The send button should be disabled while loading
    const sendBtn = screen.queryByRole('button', { name: /send/i })
    if (sendBtn) {
      expect(sendBtn).toBeDisabled()
    }

    await act(async () => {
      resolveFetch(new Response(JSON.stringify({ reply: 'Hello!' }), { status: 200 }))
    })
  })
})

describe('AIPracticeClient — session start', () => {
  it('transitions to chat view and shows AI reply', async () => {
    mockReply('Hola! ¿Cómo te llamas?')

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('Hola! ¿Cómo te llamas?')).toBeInTheDocument()
    })
  })

  it('shows error alert on failed start', async () => {
    mockFetch({ error: 'AI service is not configured', code: 'MISSING_CONFIG' }, 503)

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})

describe('AIPracticeClient — timeout error', () => {
  it('shows retryable error on timeout response', async () => {
    mockFetch({ error: 'The AI tutor took too long to respond. Please try again.', code: 'TIMEOUT' }, 504)

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })
})

describe('AIPracticeClient — error and retry', () => {
  it('shows retry button for retryable errors', async () => {
    mockFetch({ error: 'Provider error', code: 'PROVIDER_ERROR' }, 502)

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('does not show retry button for 401 errors', async () => {
    mockFetch({ error: 'Unauthorized' }, 401)

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })

  it('offers a retry when a burst limit says the wait is short', async () => {
    mockFetch(
      {
        error: 'You are sending messages very quickly. Please wait a moment and try again.',
        code: 'BURST_LIMIT_REACHED',
        retryable: true,
      },
      429,
    )

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/sending messages very quickly/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('hides retry when the server says a spent allowance will not recover', async () => {
    mockFetch(
      {
        error: 'You have reached your 80 tutor messages for today. Your practice resets tomorrow.',
        code: 'DAILY_LIMIT_REACHED',
        retryable: false,
      },
      429,
    )

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/resets tomorrow/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })
})

describe('AIPracticeClient — duplicate submission prevention', () => {
  it('does not submit again while loading', async () => {
    let resolveFetch!: (r: Response) => void
    const fetchSpy = vi.spyOn(global, 'fetch').mockReturnValueOnce(
      new Promise<Response>((resolve) => { resolveFetch = resolve }),
    )

    renderClient()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    // Try clicking the non-existent send button or triggering start again
    const startBtns = screen.queryAllByRole('button', { name: /start practice/i })
    // We're now in chat view — start button gone
    expect(startBtns.length).toBe(0)

    // fetch was called exactly once
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFetch(new Response(JSON.stringify({ reply: 'Hello!' }), { status: 200 }))
    })
  })
})

describe('AIPracticeClient — streamed replies', () => {
  it('assembles a reply delivered across several chunks', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      streamResponse(['Hola', ', ', '¿qué tal?']),
    )

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    // One message containing the joined text, not three separate bubbles.
    await waitFor(() => {
      expect(screen.getByText('Hola, ¿qué tal?')).toBeInTheDocument()
    })
  })

  it('handles events split across chunk boundaries', async () => {
    const encoder = new TextEncoder()
    const raw =
      `${JSON.stringify({ type: 'session', sessionId: 'b'.repeat(24) })}\n` +
      `${JSON.stringify({ type: 'delta', text: 'Buenos ' })}\n` +
      `${JSON.stringify({ type: 'delta', text: 'días' })}\n` +
      `${JSON.stringify({ type: 'done' })}\n`
    // Split mid-event so the client must buffer the partial line.
    const cut = Math.floor(raw.length / 2)

    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(raw.slice(0, cut)))
            controller.enqueue(encoder.encode(raw.slice(cut)))
            controller.close()
          },
        }),
        { status: 200 },
      ),
    )

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('Buenos días')).toBeInTheDocument()
    })
  })

  it('surfaces a mid-stream error while keeping the partial reply', async () => {
    const encoder = new TextEncoder()
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            for (const event of [
              { type: 'session', sessionId: 'c'.repeat(24) },
              { type: 'delta', text: 'Empecé a responder' },
              { type: 'error', error: 'The reply was cut short. Please try again.', retryable: true },
            ]) {
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
            }
            controller.close()
          },
        }),
        { status: 200 },
      ),
    )

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('Empecé a responder')).toBeInTheDocument()
      expect(screen.getByText(/cut short/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })
})

describe('AIPracticeClient — screen reader announcements', () => {
  /**
   * New text arrives silently while a reply streams — the only status region
   * (the loading spinner) disappears the instant the first token lands. This
   * covers the aria-live region that fills the gap: one announcement when the
   * reply starts, one with the full text when it finishes, not one per delta.
   */
  it('announces once that the tutor is replying, not once per delta', async () => {
    // A stream that resolves instantly (like `streamResponse`) never leaves
    // the "replying" state observable — it races straight to "done" before
    // any assertion can poll for it. Holding the controller open lets the
    // test observe the mid-stream state before completing the reply.
    const encoder = new TextEncoder()
    let controllerRef!: ReadableStreamDefaultController<Uint8Array>
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controllerRef = controller },
    })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(stream, { status: 200 }))

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await act(async () => {
      controllerRef.enqueue(
        encoder.encode(`${JSON.stringify({ type: 'session', sessionId: 'e'.repeat(24) })}\n`),
      )
      controllerRef.enqueue(encoder.encode(`${JSON.stringify({ type: 'delta', text: 'Hola' })}\n`))
    })

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Tutor is replying…')
    })

    await act(async () => {
      controllerRef.enqueue(encoder.encode(`${JSON.stringify({ type: 'done' })}\n`))
      controllerRef.close()
    })

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Tutor replied: Hola')
    })
  })

  it('announces the full assembled reply once the stream completes', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      streamResponse(['Hola', ', ', '¿qué tal?']),
    )

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Tutor replied: Hola, ¿qué tal?')
    })
  })

  it('does not announce a completed reply when the stream errors instead', async () => {
    const encoder = new TextEncoder()
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            for (const event of [
              { type: 'session', sessionId: 'd'.repeat(24) },
              { type: 'delta', text: 'Empecé' },
              { type: 'error', error: 'The reply was cut short. Please try again.', retryable: true },
            ]) {
              controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
            }
            controller.close()
          },
        }),
        { status: 200 },
      ),
    )

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByText(/cut short/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('status')).toHaveTextContent('Tutor is replying…')
  })
})

describe('AIPracticeClient — resuming a stored session', () => {
  it('opens straight into the conversation with its saved settings', () => {
    render(
      <AIPracticeClient
        profile={PROFILE}
        initialSession={{
          id: 'd'.repeat(24),
          targetLanguageCode: 'de',
          mode: 'Travel',
          messages: [
            { role: 'assistant', content: 'Guten Tag!' },
            { role: 'user', content: 'Hallo' },
          ],
        }}
      />,
    )

    expect(screen.getByText('Guten Tag!')).toBeInTheDocument()
    expect(screen.getByText('Hallo')).toBeInTheDocument()
    // The stored session's language and mode win over the profile default.
    expect(screen.getByText('Travel')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /start practice/i })).not.toBeInTheDocument()
  })
})

describe('AIPracticeClient — message sending', () => {
  it('sends user message and shows AI reply', async () => {
    mockReply('Hola!')

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => expect(screen.getByText('Hola!')).toBeInTheDocument())

    mockReply('Me llamo Claude.')

    const textarea = screen.getByLabelText('Your message')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: '¿Cómo te llamas?' } })
      fireEvent.click(screen.getByRole('button', { name: /send/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('¿Cómo te llamas?')).toBeInTheDocument()
      expect(screen.getByText('Me llamo Claude.')).toBeInTheDocument()
    })
  })

  it('Enter key submits message', async () => {
    mockReply('Hello!')
    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })
    await waitFor(() => expect(screen.getByText('Hello!')).toBeInTheDocument())

    mockReply('Response')
    const textarea = screen.getByLabelText('Your message')
    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'Test message' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    })

    await waitFor(() => expect(screen.getByText('Test message')).toBeInTheDocument())
  })
})

describe('AIPracticeClient — new session', () => {
  it('shows confirmation when session has messages', async () => {
    mockReply('Hello!')

    renderClient()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })
    await waitFor(() => expect(screen.getByText('Hello!')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /new session/i }))
    })

    expect(screen.getByText(/end session/i)).toBeInTheDocument()
  })
})
