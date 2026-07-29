import { describe, it, expect } from 'vitest'
import { DEFAULT_APP_THEME, sanitiseCustomCss, themeStyleSheet } from './theme'

describe('themeStyleSheet', () => {
  it('maps the palette onto every variable the app scope reads', () => {
    const css = themeStyleSheet({
      primaryColor: '#123456',
      primaryForeground: '#ffffff',
      customCss: '',
    })

    expect(css).toContain('--primary:#123456;')
    expect(css).toContain('--primary-foreground:#ffffff;')
    expect(css).toContain('--ring:#123456;')
    expect(css).toContain('--sidebar-primary:#123456;')
    expect(css).toContain('--sidebar-ring:#123456;')
    expect(css.startsWith('.app-scope{')).toBe(true)
  })

  it('appends custom CSS after the variable block', () => {
    const css = themeStyleSheet({ ...DEFAULT_APP_THEME, customCss: '.hero{color:red}' })
    expect(css.endsWith('.hero{color:red}')).toBe(true)
  })

  it('tolerates custom CSS being absent', () => {
    const css = themeStyleSheet({
      primaryColor: '#000',
      primaryForeground: '#fff',
      customCss: undefined as unknown as string,
    })
    expect(css.endsWith('}')).toBe(true)
  })
})

describe('sanitiseCustomCss', () => {
  // This CSS is server-rendered inside a <style> element, where the browser ends
  // the element at the first `</` whatever follows it.
  it('strips sequences that would close the style element early', () => {
    expect(sanitiseCustomCss('a{}</style><script>alert(1)</script>')).not.toContain('</')
  })

  it('removes the closing sequence in any casing or spacing', () => {
    expect(sanitiseCustomCss('</STYLE >')).toBe('STYLE >')
    expect(sanitiseCustomCss('</ style>')).toBe(' style>')
  })

  it('leaves ordinary CSS untouched', () => {
    const css = '.a > .b { content: "<x>"; }'
    expect(sanitiseCustomCss(css)).toBe(css)
  })
})
