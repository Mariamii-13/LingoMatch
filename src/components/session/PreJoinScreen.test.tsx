import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { PreJoinScreen } from "./PreJoinScreen"

function fakeStream(): MediaStream {
  return { getTracks: () => [] } as unknown as MediaStream
}

let getUserMedia: ReturnType<typeof vi.fn>

beforeEach(() => {
  getUserMedia = vi.fn().mockResolvedValue(fakeStream())
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Both toggles were plain unlabelled <button>s with no exposed state — a
 * screen reader announced "button" with no indication of what it did or
 * whether it was on. This pins the accessible-switch contract that fixes it.
 */
describe("PreJoinScreen — camera and microphone switches", () => {
  it("exposes camera and microphone as accessible switches, on by default", async () => {
    await act(async () => {
      render(<PreJoinScreen onFindPartner={() => {}} onCancel={() => {}} />)
    })

    const camera = screen.getByRole("switch", { name: "Camera" })
    const mic = screen.getByRole("switch", { name: "Microphone" })
    expect(camera).toHaveAttribute("aria-checked", "true")
    expect(mic).toHaveAttribute("aria-checked", "true")
  })

  it("flips aria-checked when a switch is toggled", async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<PreJoinScreen onFindPartner={() => {}} onCancel={() => {}} />)
    })

    const mic = screen.getByRole("switch", { name: "Microphone" })
    await act(async () => {
      await user.click(mic)
    })

    expect(mic).toHaveAttribute("aria-checked", "false")
  })
})
