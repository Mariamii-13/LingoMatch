"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { PhoneOff, Send, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Message, MatchResult } from "@/types"

interface ChatSessionProps {
  conversationId: string
  partner: MatchResult["partner"]
}

export function ChatSession({ conversationId, partner }: ChatSessionProps) {
  const router = useRouter()
  const { data: authSession } = useSession()
  const myId = authSession?.user?.id ?? ""
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/session/${conversationId}/messages`)
      const data = await res.json()
      if (data.messages) setMessages(data.messages)
    }
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [conversationId])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput("")
    await fetch(`/api/session/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    setSending(false)
  }

  const handleEnd = async () => {
    await fetch(`/api/session/${conversationId}/end`, { method: "POST" })
    router.push("/dashboard")
  }

  const handleAddFriend = async () => {
    await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: partner.id }),
    })
  }

  return (
    <div className="dark fixed inset-0 flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className={`bg-gradient-to-br ${partner.avatarColor} text-white`}>
              {partner.avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{partner.name} {partner.flag}</p>
            <p className="text-xs text-white/50">{partner.country} · Chat session</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            onClick={handleAddFriend}
          >
            <UserPlus className="size-4" /> Add Friend
          </Button>
          <button
            onClick={handleEnd}
            className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium hover:bg-red-700"
          >
            <PhoneOff className="size-4" /> End
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-sm text-white/30">
              Say hello! Start the conversation.
            </p>
          )}
          {messages.map((msg) => {
            const isMine = myId ? msg.senderId === myId : msg.senderId !== partner.id
            return (
              <div key={msg.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                {!isMine && (
                  <Avatar className="size-7 mt-1 shrink-0">
                    <AvatarFallback className={`bg-gradient-to-br ${partner.avatarColor} text-xs text-white`}>
                      {partner.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[65%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isMine ? "rounded-br-sm bg-violet-600" : "rounded-bl-sm bg-white/10"
                }`}>
                  {msg.content}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-white/10 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl bg-white/10 px-4 py-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-white/30"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-white transition-colors disabled:opacity-40 hover:bg-violet-700"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
