// src/hooks/use-match-notification.ts
"use client"

import * as React from "react"
import type { MatchPhase, MatchResult } from "@/types"

/**
 * Requests permission from inside the "find partner" click handler, so the
 * browser's user-gesture requirement is satisfied and nothing is prompted on
 * page load. A no-op once the user has already answered (granted or denied).
 */
export function requestMatchNotificationPermission(): void {
  if (typeof Notification === "undefined") return
  if (Notification.permission === "default") {
    void Notification.requestPermission()
  }
}

/**
 * Fires a system notification when a match completes while the tab is not
 * the one the learner is looking at — matching today requires staring at the
 * page (roadmap #18). Skipped when the tab is focused, since the
 * MatchFoundModal already covers that case, and when permission was never
 * granted. Clicking the notification focuses the tab; the modal is already
 * rendered underneath it by the time that happens.
 */
export function useMatchFoundNotification(phase: MatchPhase, result: MatchResult | null) {
  const notifiedIdRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (phase !== "found" || !result) return
    if (notifiedIdRef.current === result.conversationId) return
    notifiedIdRef.current = result.conversationId

    if (typeof Notification === "undefined") return
    if (Notification.permission !== "granted") return
    if (document.visibilityState === "visible" && document.hasFocus()) return

    const partnerName = result.partner.name || result.partner.username
    const notification = new Notification("Match found!", {
      body: `${partnerName} is ready to practise with you.`,
      tag: `lingomatch-match-${result.conversationId}`,
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }, [phase, result])
}
