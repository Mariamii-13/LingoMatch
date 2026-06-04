"use client"

import { useState } from "react"
import { notifications as initialNotifications, type Notification } from "@/lib/mock-data"

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return { notifications, unreadCount, markRead, markAllRead, dismiss }
}
