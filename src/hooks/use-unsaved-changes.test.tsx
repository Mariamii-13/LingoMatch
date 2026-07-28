import { describe, it, expect, vi, afterEach } from "vitest"
import { act, render } from "@testing-library/react"

import { useUnsavedChanges } from "./use-unsaved-changes"

type Api = ReturnType<typeof useUnsavedChanges>

function setup(initialDirty: boolean) {
  const api: { current: Api | null } = { current: null }

  function Probe({ isDirty }: { isDirty: boolean }) {
    api.current = useUnsavedChanges(isDirty)
    return null
  }

  const view = render(<Probe isDirty={initialDirty} />)
  return {
    api,
    setDirty: (isDirty: boolean) => view.rerender(<Probe isDirty={isDirty} />),
    unmount: view.unmount,
  }
}

/** Returns true when a listener called preventDefault on the event. */
function fireBeforeUnload(): boolean {
  const event = new Event("beforeunload", { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useUnsavedChanges", () => {
  it("does not block unload when the form is clean", () => {
    setup(false)
    expect(fireBeforeUnload()).toBe(false)
  })

  it("blocks unload while the form is dirty", () => {
    setup(true)
    expect(fireBeforeUnload()).toBe(true)
  })

  it("stops blocking unload once the guard is released", () => {
    const { api } = setup(true)
    act(() => api.current!.releaseGuard())
    expect(fireBeforeUnload()).toBe(false)
  })

  it("re-arms when the form becomes dirty again after a release", () => {
    const { api, setDirty } = setup(true)

    act(() => api.current!.releaseGuard())
    // A save marks the form clean, then the user edits it again.
    act(() => setDirty(false))
    act(() => setDirty(true))

    expect(fireBeforeUnload()).toBe(true)
  })

  it("removes the listener on unmount", () => {
    const { unmount } = setup(true)
    unmount()
    expect(fireBeforeUnload()).toBe(false)
  })

  it("confirmNavigation allows navigation without prompting when clean", () => {
    const confirmSpy = vi.spyOn(window, "confirm")
    const { api } = setup(false)
    expect(api.current!.confirmNavigation()).toBe(true)
    expect(confirmSpy).not.toHaveBeenCalled()
  })

  it("confirmNavigation prompts when dirty and honours the answer", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false)
    const { api } = setup(true)
    expect(api.current!.confirmNavigation()).toBe(false)
    expect(confirmSpy).toHaveBeenCalledOnce()
  })

  it("confirmNavigation skips the prompt after the guard is released", () => {
    const confirmSpy = vi.spyOn(window, "confirm")
    const { api } = setup(true)
    act(() => api.current!.releaseGuard())
    expect(api.current!.confirmNavigation()).toBe(true)
    expect(confirmSpy).not.toHaveBeenCalled()
  })
})
