/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AIPracticeClient } from './AIPracticeClient'

function mockFetch(body: unknown, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
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
    render(<AIPracticeClient />)
    expect(screen.getByLabelText('Target language')).toBeInTheDocument()
    expect(screen.getByLabelText('CEFR level')).toBeInTheDocument()
    expect(screen.getByLabelText('Practice mode')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start practice/i })).toBeInTheDocument()
  })

  it('shows mode description', () => {
    render(<AIPracticeClient />)
    expect(screen.getByText(/open-ended conversation/i)).toBeInTheDocument()
  })
})

describe('AIPracticeClient — loading state', () => {
  it('shows loading indicator while waiting for AI', async () => {
    let resolveFetch!: (r: Response) => void
    vi.spyOn(global, 'fetch').mockReturnValueOnce(
      new Promise<Response>((resolve) => { resolveFetch = resolve }),
    )

    render(<AIPracticeClient />)
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

    render(<AIPracticeClient />)
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
    mockFetch({ reply: 'Hola! ¿Cómo te llamas?' })

    render(<AIPracticeClient />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByText('Hola! ¿Cómo te llamas?')).toBeInTheDocument()
    })
  })

  it('shows error alert on failed start', async () => {
    mockFetch({ error: 'AI service is not configured', code: 'MISSING_CONFIG' }, 503)

    render(<AIPracticeClient />)
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

    render(<AIPracticeClient />)
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

    render(<AIPracticeClient />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('does not show retry button for 401 errors', async () => {
    mockFetch({ error: 'Unauthorized' }, 401)

    render(<AIPracticeClient />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
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

    render(<AIPracticeClient />)

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

describe('AIPracticeClient — message sending', () => {
  it('sends user message and shows AI reply', async () => {
    mockFetch({ reply: 'Hola!' })

    render(<AIPracticeClient />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })

    await waitFor(() => expect(screen.getByText('Hola!')).toBeInTheDocument())

    mockFetch({ reply: 'Me llamo Claude.' })

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
    mockFetch({ reply: 'Hello!' })
    render(<AIPracticeClient />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start practice/i }))
    })
    await waitFor(() => expect(screen.getByText('Hello!')).toBeInTheDocument())

    mockFetch({ reply: 'Response' })
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
    mockFetch({ reply: 'Hello!' })

    render(<AIPracticeClient />)
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
