"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Loader2, MessageSquare, UserMinus, UserPlus, X } from "lucide-react"
import { toast } from "sonner"

import { avatarGradient } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getLanguage } from "@/constants/languages"

interface UserCard {
  id: string
  username: string
  displayName: string
  avatar: string
  country: string
  nativeLanguages: string[]
  learningLanguages: { code: string; level: string }[]
}

interface FriendsData {
  friends: UserCard[]
  incoming: UserCard[]
  sent: UserCard[]
}


function initials(displayName: string) {
  return displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function LanguageBadges({ user }: { user: UserCard }) {
  return (
    <div className="flex flex-wrap gap-1">
      {user.nativeLanguages.map((code) => {
        const l = getLanguage(code)
        return (
          <Badge key={`n-${code}`} variant="secondary" className="text-xs">
            {l.flag} {l.code}
          </Badge>
        )
      })}
      {user.learningLanguages.map(({ code, level }) => {
        const l = getLanguage(code)
        return (
          <Badge key={`l-${code}`} variant="outline" className="text-xs">
            {l.flag} {l.code} · {level}
          </Badge>
        )
      })}
    </div>
  )
}

function UserAvatar({ user }: { user: UserCard }) {
  const gradient = avatarGradient(user.username)
  const init = initials(user.displayName)
  return (
    <Avatar className="size-12 shrink-0">
      {user.avatar ? <AvatarImage src={user.avatar} alt={user.displayName} /> : null}
      <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white font-semibold`}>
        {init}
      </AvatarFallback>
    </Avatar>
  )
}

export default function FriendsPage() {
  const router = useRouter()
  const [data, setData] = React.useState<FriendsData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [fetchError, setFetchError] = React.useState(false)
  const [busy, setBusy] = React.useState<Record<string, boolean>>({})

  React.useEffect(() => {
    fetch("/api/friends")
      .then((r) => {
        if (!r.ok) { setFetchError(true); return null }
        return r.json()
      })
      .then((d) => { if (d) setData(d) })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [])

  function setBusyFor(id: string, val: boolean) {
    setBusy((b) => ({ ...b, [id]: val }))
  }

  async function acceptRequest(user: UserCard) {
    setBusyFor(user.id, true)
    try {
      const res = await fetch(`/api/friends/${user.id}/accept`, { method: "POST" })
      if (!res.ok) { toast.error("Failed to accept request"); return }
      setData((d) => {
        if (!d) return d
        return {
          friends: [...d.friends, user],
          incoming: d.incoming.filter((u) => u.id !== user.id),
          sent: d.sent,
        }
      })
      toast.success(`You and ${user.displayName} are now friends!`)
    } catch {
      toast.error("Failed to accept request")
    } finally {
      setBusyFor(user.id, false)
    }
  }

  async function declineRequest(user: UserCard) {
    setBusyFor(user.id, true)
    try {
      const res = await fetch(`/api/friends/${user.id}/decline`, { method: "POST" })
      if (!res.ok) { toast.error("Failed to decline request"); return }
      setData((d) => {
        if (!d) return d
        return { ...d, incoming: d.incoming.filter((u) => u.id !== user.id) }
      })
      toast.success("Request declined.")
    } catch {
      toast.error("Failed to decline request")
    } finally {
      setBusyFor(user.id, false)
    }
  }

  async function cancelRequest(user: UserCard) {
    setBusyFor(user.id, true)
    try {
      const res = await fetch(`/api/friends/${user.id}/request`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to cancel request"); return }
      setData((d) => {
        if (!d) return d
        return { ...d, sent: d.sent.filter((u) => u.id !== user.id) }
      })
      toast.success("Friend request cancelled.")
    } catch {
      toast.error("Failed to cancel request")
    } finally {
      setBusyFor(user.id, false)
    }
  }

  async function openChat(user: UserCard) {
    setBusyFor(user.id, true)
    try {
      const res = await fetch("/api/conversations/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: user.id }),
      })
      if (!res.ok) { toast.error("Failed to open chat"); return }
      const conv = await res.json()
      router.push(`/messages/${conv.id}`)
    } catch {
      toast.error("Failed to open chat")
    } finally {
      setBusyFor(user.id, false)
    }
  }

  async function removeFriend(user: UserCard) {
    setBusyFor(user.id, true)
    try {
      const res = await fetch(`/api/friends/${user.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to remove friend"); return }
      setData((d) => {
        if (!d) return d
        return { ...d, friends: d.friends.filter((u) => u.id !== user.id) }
      })
      toast.success(`${user.displayName} removed from friends.`)
    } catch {
      toast.error("Failed to remove friend")
    } finally {
      setBusyFor(user.id, false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-lg font-semibold">Something went wrong</p>
        <p className="text-sm text-muted-foreground">Could not load friends. Please try again.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  const friends = data?.friends ?? []
  const incoming = data?.incoming ?? []
  const sent = data?.sent ?? []

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
          <TabsTrigger value="friends">
            Friends
            {friends.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">{friends.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="incoming">
            Requests
            {incoming.length > 0 && (
              <Badge variant="default" className="ml-1.5">{incoming.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent
            {sent.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">{sent.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Friends tab */}
        <TabsContent value="friends" className="mt-6">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-lg font-semibold">No friends yet</p>
              <p className="text-sm text-muted-foreground">
                Explore users and send friend requests to start connecting.
              </p>
              <Button nativeButton={false} render={<Link href="/explore" />}>
                <UserPlus className="size-4" /> Find People
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {friends.map((user) => (
                <div key={user.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/profile/${user.username}`}
                        className="truncate font-medium hover:underline"
                      >
                        {user.displayName}
                        {user.country ? ` · ${user.country}` : ""}
                      </Link>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                      <div className="mt-2">
                        <LanguageBadges user={user} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={busy[user.id]}
                      onClick={() => openChat(user)}
                    >
                      {busy[user.id]
                        ? <Loader2 className="size-4 animate-spin" />
                        : <MessageSquare className="size-4" />}
                      Chat
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={busy[user.id]}
                      onClick={() => removeFriend(user)}
                    >
                      {busy[user.id]
                        ? <Loader2 className="size-4 animate-spin" />
                        : <UserMinus className="size-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Incoming requests tab */}
        <TabsContent value="incoming" className="mt-6">
          {incoming.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-lg font-semibold">No pending requests</p>
              <p className="text-sm text-muted-foreground">
                When someone sends you a friend request, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incoming.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
                >
                  <UserAvatar user={user} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${user.username}`}
                      className="truncate font-medium hover:underline"
                    >
                      {user.displayName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      @{user.username}
                      {user.country ? ` · ${user.country}` : ""}
                    </p>
                    <div className="mt-1.5">
                      <LanguageBadges user={user} />
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="icon-sm"
                      aria-label="Accept"
                      disabled={busy[user.id]}
                      onClick={() => acceptRequest(user)}
                    >
                      {busy[user.id]
                        ? <Loader2 className="size-4 animate-spin" />
                        : <Check className="size-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      aria-label="Decline"
                      disabled={busy[user.id]}
                      onClick={() => declineRequest(user)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sent requests tab */}
        <TabsContent value="sent" className="mt-6">
          {sent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-lg font-semibold">No sent requests</p>
              <p className="text-sm text-muted-foreground">
                Friend requests you&apos;ve sent will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sent.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
                >
                  <UserAvatar user={user} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${user.username}`}
                      className="truncate font-medium hover:underline"
                    >
                      {user.displayName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      @{user.username}
                      {user.country ? ` · ${user.country}` : ""}
                    </p>
                    <div className="mt-1.5">
                      <LanguageBadges user={user} />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={busy[user.id]}
                    onClick={() => cancelRequest(user)}
                  >
                    {busy[user.id]
                      ? <Loader2 className="size-4 animate-spin" />
                      : <X className="size-4" />}
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
