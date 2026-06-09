"use client"

import * as React from "react"
import { Send, X } from "lucide-react"
import type { Message } from "@/types"

interface ChatPanelProps {
  messages: Message[]
  partnerId: string
  myId: string
  onSend: (content: string) => void
  onClose: () => void
}

export function ChatPanel({ messages, partnerId, myId, onSend, onClose }: ChatPanelProps) {
  const [input, setInput] = React.useState("")
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput("")
  }

  return (
    <div className="absolute inset-y-0 right-0 z-30 flex w-80 max-w-[85%] flex-col border-l border-white/10 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="font-semibold">Chat</h3>
        <button onClick={onClose} className="text-white/50 hover:text-white">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 px-3 py-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-white/30">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isMine = myId ? msg.senderId === myId : msg.senderId !== partnerId
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                isMine ? "rounded-br-sm bg-violet-600" : "rounded-bl-sm bg-white/10"
              }`}>
                {msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend() }}
            placeholder="Message..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="text-violet-400 disabled:opacity-40 hover:text-violet-300"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
