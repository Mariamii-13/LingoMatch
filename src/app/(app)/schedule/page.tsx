"use client"

import * as React from "react"
import { CalendarPlus, Clock, Globe } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { conversationModes, scheduledSessions } from "@/lib/mock-data"

export default function SchedulePage() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Schedule</h1>
          <p className="mt-1 text-muted-foreground">
            Plan conversations with your partners ahead of time.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <CalendarPlus className="size-4" /> Schedule Session
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a session</DialogTitle>
              <DialogDescription>
                Set a time and pick a partner to practice with.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="partner">Partner</Label>
                <Input id="partner" placeholder="Search by name or @username" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" type="time" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mode">Mode</Label>
                <select
                  id="mode"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  {conversationModes.map((m) => (
                    <option key={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button onClick={() => setOpen(false)}>Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {scheduledSessions.map((s) => (
          <div
            key={s.id}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
          >
            <Avatar size="lg">
              <AvatarFallback className={`bg-gradient-to-br ${s.partner.avatarColor} text-white`}>
                {s.partner.avatarInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.partner.name} {s.partner.flag}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" /> {s.date} · {s.time}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="size-3.5" /> {s.timezone}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{s.mode}</Badge>
              <Badge variant="outline">{s.language}</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
