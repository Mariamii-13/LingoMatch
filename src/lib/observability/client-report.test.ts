import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CLIENT_ERROR_ENDPOINT,
  MAX_REPORTS_PER_PAGE_LOAD,
  buildClientReport,
  reportBrowserError,
  resetClientReportBudget,
} from './client-report'

describe('buildClientReport', () => {
  it('describes an Error', () => {
    const report = buildClientReport({ kind: 'window', error: new TypeError('undefined is not a function') })

    expect(report).toMatchObject({
      kind: 'window',
      name: 'TypeError',
      message: 'undefined is not a function',
    })
    expect(report!.stack).toContain('TypeError')
  })

  it('carries the digest a boundary already showed the user', () => {
    const error = Object.assign(new Error('render failed'), { digest: '2891374611' })
    expect(buildClientReport({ kind: 'boundary', error })!.digest).toBe('2891374611')
  })

  it('falls back to a supplied message when there is no Error object', () => {
    const report = buildClientReport({ kind: 'unhandledrejection', error: undefined, message: 'rejected with a string' })
    expect(report!.message).toBe('rejected with a string')
  })

  it('keeps what a rejection actually carried in preference to the generic label', () => {
    const fromString = buildClientReport({
      kind: 'unhandledrejection',
      error: 'fetch aborted',
      message: 'Unhandled promise rejection',
    })
    expect(fromString!.message).toBe('fetch aborted')

    const fromObject = buildClientReport({
      kind: 'unhandledrejection',
      error: { status: 502 },
      message: 'Unhandled promise rejection',
    })
    expect(fromObject!.message).toContain('502')
  })

  it('drops reports with nothing to say, so cross-origin noise is not forwarded', () => {
    // A cross-origin script failure reaches window.onerror as a bare
    // "Script error." with no stack — it identifies nothing and is not ours.
    expect(buildClientReport({ kind: 'window', error: undefined, message: '' })).toBeNull()
    expect(buildClientReport({ kind: 'window', error: undefined, message: 'Script error.' })).toBeNull()
  })
})

describe('reportBrowserError', () => {
  beforeEach(() => {
    resetClientReportBudget()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts the report to the ingest endpoint', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    reportBrowserError({ kind: 'boundary', error: new Error('boom') })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(CLIENT_ERROR_ENDPOINT)
    expect(init.method).toBe('POST')
    expect(init.keepalive).toBe(true)
    expect(JSON.parse(String(init.body)).message).toBe('boom')
  })

  it('prefers sendBeacon when the browser has it, so a report survives navigation', () => {
    const beacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { ...globalThis.navigator, sendBeacon: beacon })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    reportBrowserError({ kind: 'window', error: new Error('boom') })

    expect(beacon).toHaveBeenCalledTimes(1)
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('stops after a handful of reports so an error loop cannot flood the endpoint', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    for (let i = 0; i < MAX_REPORTS_PER_PAGE_LOAD + 5; i++) {
      reportBrowserError({ kind: 'window', error: new Error(`boom ${i}`) })
    }

    expect(fetchSpy).toHaveBeenCalledTimes(MAX_REPORTS_PER_PAGE_LOAD)
  })

  it('sends nothing when there is nothing worth sending', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    reportBrowserError({ kind: 'window', message: 'Script error.' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('never throws when reporting itself fails', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new Error('offline')
    })
    expect(() => reportBrowserError({ kind: 'window', error: new Error('boom') })).not.toThrow()
  })
})
