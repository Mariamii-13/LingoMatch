"use client"

import Link from "next/link"
import { Check, MessageSquare, Mic, UserPlus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Friend } from "@/types"
import { friendRequests, mockFriends, suggestedFriends } from "@/lib/mock-data"

function LanguageBadges({ friend }: { friend: Friend }) {
  return (
    <div className="flex flex-wrap gap-1">
      {friend.native.map((l) => (
        <Badge key={`n-${l.code}`} variant="secondary">
          {l.flag} {l.code}
        </Badge>
      ))}
      {friend.learning.map((l) => (
        <Badge key={`l-${l.code}`} variant="outline">
          {l.flag} {l.code} · {l.level}
        </Badge>
      ))}
    </div>
  )
}

export default function FriendsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Friends</h1>
        <p className="mt-1 text-muted-foreground">
          Your language partners and connection requests.
        </p>
      </div>

      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            <Badge variant="default" className="ml-1">
              {friendRequests.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="find">Find Friends</TabsTrigger>
        </TabsList>

        {/* Friends */}
        <TabsContent value="friends" className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {mockFriends.map((f) => (
              <div key={f.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar size="lg">
                      <AvatarFallback className={`bg-gradient-to-br ${f.avatarColor} text-white`}>
                        {f.avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-card",
                        f.online ? "bg-emerald-500" : "bg-zinc-400"
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${f.username}`}
                      className="truncate font-medium hover:underline"
                    >
                      {f.name} {f.flag}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {f.online ? "Online" : f.lastActive}
                    </p>
                    <div className="mt-2">
                      <LanguageBadges friend={f} />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <MessageSquare className="size-4" /> Chat
                  </Button>
                  <Button size="sm" className="flex-1" render={<Link href={`/session/${f.id}`} />}>
                    <Mic className="size-4" /> Match
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Requests */}
        <TabsContent value="requests" className="mt-6">
          <div className="space-y-3">
            {friendRequests.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <Avatar size="lg">
                  <AvatarFallback className={`bg-gradient-to-br ${f.avatarColor} text-white`}>
                    {f.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.name} {f.flag}</p>
                  <p className="text-xs text-muted-foreground">
                    wants to connect · {f.lastActive}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon-sm" aria-label="Accept">
                    <Check className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm" aria-label="Decline">
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Find */}
        <TabsContent value="find" className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {suggestedFriends.map((f) => (
              <div key={f.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar size="lg">
                    <AvatarFallback className={`bg-gradient-to-br ${f.avatarColor} text-white`}>
                      {f.avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link href={`/profile/${f.username}`} className="font-medium hover:underline">
                      {f.name} {f.flag}
                    </Link>
                    <p className="text-xs text-muted-foreground">{f.country}</p>
                    <div className="mt-2">
                      <LanguageBadges friend={f} />
                    </div>
                  </div>
                </div>
                <Button size="sm" className="mt-4 w-full">
                  <UserPlus className="size-4" /> Add Friend
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
