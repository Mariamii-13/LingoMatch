"use client"

import * as React from "react"
import Link from "next/link"
import { use } from "react"
import { CalendarDays, Loader2, MessageSquare, UserCheck, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"

import { avatarGradient, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { languageOptions } from "@/lib/mock-data"


function langMeta(code: string) {
  return languageOptions.find((l) => l.code === code) ?? { code, name: code, flag: "" }
}

interface PublicProfile {
  id: string
  username: string
  displayName: string
  avatar: string
  bio: string
  country: string
  nativeLanguages: string[]
  learningLanguages: { code: string; level: string }[]
  interestTags: string[]
  friendsCount: number
  joinedAt: string
  friendStatus: "self" | "friends" | "pending_sent" | "pending_received" | "none"
}

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = use(params)
  const [profile, setProfile] = React.useState<PublicProfile | null>(null)
  const [notFound, setNotFound] = React.useState(false)
  const [fetchError, setFetchError] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [friendBusy, setFriendBusy] = React.useState(false)

  React.useEffect(() => {
    fetch(`/api/users/${encodeURIComponent(username)}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null }
        if (!r.ok) { setFetchError(true); return null }
        return r.json()
      })
      .then((data) => { if (data) setProfile(data) })
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false))
  }, [username])

  async function sendFriendRequest() {
    if (!profile) return
    setFriendBusy(true)
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: profile.id }),
      })
      if (!res.ok) { toast.error("Failed to send request"); return }
      setProfile((p) => p ? { ...p, friendStatus: "pending_sent" } : p)
      toast.success("Friend request sent!")
    } catch {
      toast.error("Failed to send request")
    } finally {
      setFriendBusy(false)
    }
  }

  async function acceptFriendRequest() {
    if (!profile) return
    setFriendBusy(true)
    try {
      const res = await fetch(`/api/friends/${profile.id}/accept`, { method: "POST" })
      if (!res.ok) { toast.error("Failed to accept request"); return }
      setProfile((p) => p ? { ...p, friendStatus: "friends" } : p)
      toast.success("Friend request accepted!")
    } catch {
      toast.error("Failed to accept request")
    } finally {
      setFriendBusy(false)
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
        <p className="text-sm text-muted-foreground">Could not load this profile. Please try again.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-lg font-semibold">User not found</p>
        <p className="text-sm text-muted-foreground">@{username} doesn&apos;t exist or has been removed.</p>
        <Button variant="outline" render={<Link href="/explore" />}>Browse users</Button>
      </div>
    )
  }

  const initials = profile.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const gradient = avatarGradient(profile.username)
  const joinYear = new Date(profile.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  const langCount = profile.nativeLanguages.length + profile.learningLanguages.length

  return (
    <div className="mx-auto max-w-3xl">
      {/* Cover */}
      <div className="relative h-40 rounded-2xl bg-gradient-to-br from-primary via-fuchsia-500 to-blue-500 sm:h-48" />

      <div className="px-4 sm:px-6">
        {/* Avatar + actions row */}
        <div className="-mt-12 flex flex-col items-center text-center sm:-mt-14 sm:flex-row sm:items-end sm:text-left">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className={cn("size-24 ring-4 ring-background sm:size-28")}>
              {profile.avatar ? (
                <AvatarImage src={profile.avatar} alt={profile.displayName} />
              ) : null}
              <AvatarFallback
                className={cn("bg-gradient-to-br text-white text-2xl font-semibold", gradient)}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name */}
          <div className="mt-3 flex-1 sm:mb-2 sm:ml-4 sm:mt-0">
            <h1 className="text-xl font-bold">{profile.displayName}</h1>
            <p className="text-sm text-muted-foreground">
              @{profile.username}
              {profile.country ? ` · ${profile.country}` : ""}
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex gap-2 sm:mb-2 sm:mt-0">
            {profile.friendStatus === "self" && (
              <Button variant="outline" render={<Link href="/settings" />}>
                Edit Profile
              </Button>
            )}

            {profile.friendStatus === "none" && (
              <Button onClick={sendFriendRequest} disabled={friendBusy}>
                {friendBusy
                  ? <Loader2 className="size-4 animate-spin" />
                  : <UserPlus className="size-4" />}
                Add Friend
              </Button>
            )}

            {profile.friendStatus === "pending_sent" && (
              <Button variant="outline" disabled>
                <UserPlus className="size-4" />
                Request Sent
              </Button>
            )}

            {profile.friendStatus === "pending_received" && (
              <Button onClick={acceptFriendRequest} disabled={friendBusy}>
                {friendBusy
                  ? <Loader2 className="size-4 animate-spin" />
                  : <UserCheck className="size-4" />}
                Accept Request
              </Button>
            )}

            {profile.friendStatus === "friends" && (
              <Button variant="outline" disabled>
                <UserCheck className="size-4" />
                Friends
              </Button>
            )}

            <Button
              variant="outline"
              disabled
              title="Coming soon"
            >
              <MessageSquare className="size-4" />
              Message
            </Button>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-6 text-center text-sm text-muted-foreground sm:text-left">
            {profile.bio}
          </p>
        )}

        {/* Languages */}
        {(profile.nativeLanguages.length > 0 || profile.learningLanguages.length > 0) && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Languages
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.nativeLanguages.map((code) => {
                const lang = langMeta(code)
                return (
                  <Badge key={code} variant="secondary">
                    {lang.flag} {lang.name} · Native
                  </Badge>
                )
              })}
              {profile.learningLanguages.map(({ code, level }) => {
                const lang = langMeta(code)
                return (
                  <Badge key={code} variant="outline">
                    {lang.flag} {lang.name} · {level}
                  </Badge>
                )
              })}
            </div>
          </section>
        )}

        {/* Interests */}
        {profile.interestTags.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Interests
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.interestTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border bg-card px-3 py-1 text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <Users className="mx-auto size-4 text-primary" />
            <p className="mt-2 text-xl font-bold">{profile.friendsCount}</p>
            <p className="text-xs text-muted-foreground">Friends</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <span className="mx-auto block text-center text-base">🌐</span>
            <p className="mt-2 text-xl font-bold">{langCount}</p>
            <p className="text-xs text-muted-foreground">Languages</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <CalendarDays className="mx-auto size-4 text-primary" />
            <p className="mt-2 text-sm font-bold">{joinYear}</p>
            <p className="text-xs text-muted-foreground">Member since</p>
          </div>
        </section>
      </div>
    </div>
  )
}
