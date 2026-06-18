import { MessageSquare } from "lucide-react"

export default function MessagesIndexPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div className="rounded-full bg-muted p-5">
        <MessageSquare className="size-8 text-muted-foreground/50" />
      </div>
      <p className="text-lg font-semibold">Your Messages</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Select a conversation from the list to start chatting
      </p>
    </div>
  )
}
