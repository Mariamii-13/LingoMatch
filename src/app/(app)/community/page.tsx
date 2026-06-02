"use client"

import * as React from "react"
import { ChevronUp, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { Feedback, FeedbackStatus, FeedbackType } from "@/types"
import { mockFeedback } from "@/lib/mock-data"

const statusStyles: Record<FeedbackStatus, string> = {
  open: "bg-zinc-500/15 text-zinc-500",
  planned: "bg-blue-500/15 text-blue-500",
  "in-progress": "bg-amber-500/15 text-amber-600",
  shipped: "bg-emerald-500/15 text-emerald-600",
  closed: "bg-zinc-500/15 text-zinc-500",
}

function FeedbackCard({ item }: { item: Feedback }) {
  const [votes, setVotes] = React.useState(item.votes)
  const [voted, setVoted] = React.useState(!!item.hasVoted)

  const toggleVote = () => {
    setVoted((v) => {
      setVotes((n) => (v ? n - 1 : n + 1))
      return !v
    })
  }

  return (
    <div className="flex gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <button
        onClick={toggleVote}
        className={cn(
          "flex h-fit flex-col items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
          voted
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:bg-accent"
        )}
      >
        <ChevronUp className="size-4" />
        {votes}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{item.title}</h3>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              statusStyles[item.status]
            )}
          >
            {item.status.replace("-", " ")}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar size="sm">
            <AvatarFallback className="bg-muted text-[10px]">
              {item.authorInitials}
            </AvatarFallback>
          </Avatar>
          {item.author} · {item.createdAt}
        </div>
      </div>
    </div>
  )
}

function FeedbackList({ type }: { type: FeedbackType }) {
  const items = mockFeedback
    .filter((f) => f.type === type)
    .sort((a, b) => b.votes - a.votes)
  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nothing here yet. Be the first to post!
        </p>
      ) : (
        items.map((item) => <FeedbackCard key={item.id} item={item} />)
      )}
    </div>
  )
}

export default function CommunityPage() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Community</h1>
          <p className="mt-1 text-muted-foreground">
            Share ideas, report bugs, and vote on what we build next.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" /> Submit Idea
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit feedback</DialogTitle>
              <DialogDescription>
                Tell us what would make LingoMatch better.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
                >
                  <option value="idea">Idea</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" placeholder="Short summary" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" rows={4} placeholder="Describe it in detail..." />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button onClick={() => setOpen(false)}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="idea">
        <TabsList>
          <TabsTrigger value="idea">Ideas</TabsTrigger>
          <TabsTrigger value="bug">Bug Reports</TabsTrigger>
          <TabsTrigger value="feature">Feature Requests</TabsTrigger>
        </TabsList>
        <TabsContent value="idea" className="mt-6">
          <FeedbackList type="idea" />
        </TabsContent>
        <TabsContent value="bug" className="mt-6">
          <FeedbackList type="bug" />
        </TabsContent>
        <TabsContent value="feature" className="mt-6">
          <FeedbackList type="feature" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
