import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { SessionControls } from "./SessionControls"

function noop() {}

describe("SessionControls — toggle state exposed to assistive tech", () => {
  it("reflects camera, microphone and chat state via aria-pressed", () => {
    render(
      <SessionControls
        cameraEnabled={true}
        micEnabled={false}
        chatOpen={true}
        onToggleCamera={noop}
        onToggleMic={noop}
        onToggleChat={noop}
        onAddFriend={noop}
        onEnd={noop}
      />,
    )

    expect(screen.getByRole("button", { name: "Turn off camera" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByRole("button", { name: "Unmute" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    expect(screen.getByRole("button", { name: "Chat" })).toHaveAttribute("aria-pressed", "true")
  })

  it("calls the matching handler for each control", () => {
    const onToggleCamera = vi.fn()
    const onEnd = vi.fn()
    render(
      <SessionControls
        cameraEnabled={true}
        micEnabled={true}
        chatOpen={false}
        onToggleCamera={onToggleCamera}
        onToggleMic={noop}
        onToggleChat={noop}
        onAddFriend={noop}
        onEnd={onEnd}
      />,
    )

    screen.getByRole("button", { name: "Turn off camera" }).click()
    screen.getByRole("button", { name: "End" }).click()

    expect(onToggleCamera).toHaveBeenCalledOnce()
    expect(onEnd).toHaveBeenCalledOnce()
  })
})
