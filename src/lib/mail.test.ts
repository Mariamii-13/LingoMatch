import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMail = vi.fn()
const createTransport = vi.fn(() => ({ sendMail }))

vi.mock('nodemailer', () => ({ default: { createTransport: (...args: unknown[]) => createTransport(...args) } }))

const { sendPasswordResetEmail } = await import('./mail')

describe('sendPasswordResetEmail', () => {
  beforeEach(() => {
    sendMail.mockReset().mockResolvedValue(undefined)
    createTransport.mockClear()
    process.env.GMAIL_USER = 'bot@example.com'
    process.env.GMAIL_APP_PASSWORD = 'app-password'
  })

  it('sends through Gmail SMTP with the reset link in the body', async () => {
    await sendPasswordResetEmail('user@example.com', 'https://app.example.com/reset-password?token=abc123')

    expect(createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'bot@example.com', pass: 'app-password' },
    })
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        text: expect.stringContaining('https://app.example.com/reset-password?token=abc123'),
        html: expect.stringContaining('https://app.example.com/reset-password?token=abc123'),
      }),
    )
  })

  it('throws when GMAIL_USER is missing, instead of silently no-opping', async () => {
    delete process.env.GMAIL_USER
    await expect(sendPasswordResetEmail('user@example.com', 'https://x/y')).rejects.toThrow(
      /Gmail credentials/,
    )
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('throws when GMAIL_APP_PASSWORD is missing', async () => {
    delete process.env.GMAIL_APP_PASSWORD
    await expect(sendPasswordResetEmail('user@example.com', 'https://x/y')).rejects.toThrow(
      /Gmail credentials/,
    )
  })

  it('never includes the app password in the thrown error message', async () => {
    process.env.GMAIL_APP_PASSWORD = 'super-secret-value'
    delete process.env.GMAIL_USER
    await expect(sendPasswordResetEmail('user@example.com', 'https://x/y')).rejects.not.toThrow(
      /super-secret-value/,
    )
  })
})
