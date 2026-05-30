"use client"

import * as React from "react"
import Link from "next/link"
import { use } from "react"
import { CalendarDays, Mic, Play, UserPlus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { currentUser, mockUsers } from "@/lib/mock-data"

export default function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = use(params)
  const user =
    [...mockUsers, currentUser].find((u) => u.username === username) ?? mockUsers[0]

  return (
    <div className="mx-auto max-w-3xl">
      {/* Cover */}
      <div className="relative h-40 rounded-2xl bg-gradient-to-br from-primary via-fuchsia-500 to-blue-500 sm:h-48" />

      <div className="px-4 sm:px-6">
        {/* Avatar */}
        <div className="-mt-12 flex flex-col items-center text-center sm:-mt-14 sm:flex-row sm:items-end sm:text-left">
          <div className="relative">
            <div className={`flex size-24 items-center justify-center rounded-full bg-gradient-to-br ${user.avatarColor} text-2xl font-semibold text-white ring-4 ring-background sm:size-28`}>
              {user.avatarInitials}
            </div>
            <span className="absolute bottom-1 right-1 text-2xl">{user.flag}</span>
          </div>
          <div className="mt-3 flex-1 sm:mb-2 sm:ml-4 sm:mt-0">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-xl font-bold">{user.name}</h1>
              {user.online && (
                <Badge variant="secondary" className="gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Online
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{user.username} · {user.country}</p>
          </div>
          <div className="mt-4 flex gap-2 sm:mb-2 sm:mt-0">
            <Button render={<Link href={`/session/${user.id}`} />}>
              <Mic className="size-4" /> Match with {user.name.split(" ")[0]}
            </Button>
            <Button variant="outline">
              <UserPlus className="size-4" /> Add Friend
            </Button>
          </div>
        </div>

        {user.bio && (
          <p className="mt-6 text-center text-sm text-muted-foreground sm:text-left">
            {user.bio}
          </p>
        )}

        {/* Voice intro */}
        <div className="mt-6 flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <Button size="icon-lg" className="rounded-full">
            <Play className="size-5" />
          </Button>
          <div className="flex-1">
            <p className="text-sm font-medium">Voice intro</p>
            <p className="text-xs text-muted-foreground">Hear {user.name.split(" ")[0]}&apos;s voice · 0:12</p>
          </div>
          <div className="hidden h-8 items-end gap-0.5 sm:flex">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="w-0.5 rounded-full bg-primary/50"
                style={{ height: `${20 + ((i * 37) % 80)}%` }}
              />
            ))}
          </div>
        </div>

        {/* Languages */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Languages</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.native.map((l) => (
              <Badge key={l.code} variant="secondary">
                {l.flag} {l.name} · Native
              </Badge>
            ))}
            {user.learning.map((l) => (
              <Badge key={l.code} variant="outline">
                {l.flag} {l.name} · {l.level}
              </Badge>
            ))}
          </div>
        </section>

        {/* Interests */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground">Interests</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.interests.map((tag) => (
              <span
                key={tag}
                className="rounded-full border bg-card px-3 py-1 text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <Mic className="mx-auto size-4 text-primary" />
            <p className="mt-2 text-xl font-bold">{user.sessionsCount}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <Users className="mx-auto size-4 text-primary" />
            <p className="mt-2 text-xl font-bold">{user.friendsCount}</p>
            <p className="text-xs text-muted-foreground">Friends</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <CalendarDays className="mx-auto size-4 text-primary" />
            <p className="mt-2 text-sm font-bold">{user.memberSince}</p>
            <p className="text-xs text-muted-foreground">Member Since</p>
          </div>
        </section>
      </div>
    </div>
  )
}
