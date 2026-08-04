"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Check, Clock, Loader2, MessageSquare, Mic, Search, UserCheck, UserPlus, Users, Video } from "lucide-react"
import { toast } from "sonner"

import { avatarGradient } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { LANGUAGES, getLanguage, formatLevel, migrateLegacyLevel } from "@/constants/languages"
import { CountrySelector } from "@/components/country-selector"
import { FlagImage } from "@/components/shared/flag-image"

type FriendStatus = "none" | "pending_sent" | "pending_received" | "friends"

interface ExploreUser {
  id: string
  username: string
  displayName: string
  avatar: string
  bio: string
  country: string
  spokenLanguages: { code: string; level: string }[]
  learningLanguages: { code: string; level: string }[]
  interestCategories: string[]
  friendStatus: FriendStatus
}

interface ExploreResponse {
  users: ExploreUser[]
  total: number
  hasMore: boolean
}

const INTERESTS = [
  { key: "anime", label: "Anime" },
  { key: "books", label: "Books" },
  { key: "movies", label: "Movies" },
  { key: "music", label: "Music" },
  { key: "gaming", label: "Gaming" },
  { key: "travel", label: "Travel" },
  { key: "food", label: "Food" },
  { key: "hobbies", label: "Hobbies" },
]


function buildUrl(q: string, country: string, language: string, interest: string, page: number) {
  const params = new URLSearchParams()
  if (q) params.set("q", q)
  if (country) params.set("country", country)
  if (language) params.set("language", language)
  if (interest) params.set("interest", interest)
  params.set("page", String(page))
  params.set("limit", "20")
  return `/api/users/search?${params.toString()}`
}

function UserCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  )
}

function AddFriendButton({ userId, initial }: { userId: string; initial: FriendStatus }) {
  const [status, setStatus] = useState<FriendStatus>(initial)
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    setLoading(true)
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      })
      if (res.ok) {
        setStatus("pending_sent")
        toast.success("Friend request sent!")
      } else {
        toast.error("Failed to send request")
      }
    } catch {
      toast.error("Failed to send request")
    } finally {
      setLoading(false)
    }
  }

  if (status === "friends") {
    return (
      <Button variant="secondary" size="sm" className="w-full" disabled>
        <UserCheck className="size-4" /> Friends
      </Button>
    )
  }
  if (status === "pending_sent") {
    return (
      <Button variant="secondary" size="sm" className="w-full" disabled>
        <Clock className="size-4" /> Request Sent
      </Button>
    )
  }
  if (status === "pending_received") {
    return (
      <Button variant="outline" size="sm" className="w-full" nativeButton={false} render={<Link href={`/friends`} />}>
        <Check className="size-4" /> Accept Request
      </Button>
    )
  }
  return (
    <Button size="sm" className="w-full" onClick={handleAdd} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
      Add Friend
    </Button>
  )
}

function UserCard({ user }: { user: ExploreUser }) {
  const gradient = avatarGradient(user.username)
  const init = user.displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
      <Link href={`/profile/${user.username}`} className="flex items-start gap-3">
        <Avatar className="size-12 shrink-0">
          {user.avatar ? <AvatarImage src={user.avatar} alt={user.displayName} /> : null}
          <AvatarFallback className={`bg-gradient-to-br ${gradient} text-sm font-semibold text-white`}>
            {init}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{user.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">
            @{user.username}
            {user.country ? ` · ${user.country}` : ""}
          </p>
        </div>
      </Link>

      {user.bio && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{user.bio}</p>
      )}

      <div className="flex flex-wrap gap-1">
        {user.spokenLanguages.map(({ code }) => {
          const l = getLanguage(code)
          return (
            <Badge key={`s-${code}`} variant="secondary" className="text-xs">
              <FlagImage flag={l.flag} /> {l.name}
            </Badge>
          )
        })}
        {user.learningLanguages.slice(0, 2).map(({ code, level }) => {
          const l = getLanguage(code)
          return (
            <Badge key={`l-${code}`} variant="outline" className="text-xs">
              <FlagImage flag={l.flag} /> {l.name} · {formatLevel(migrateLegacyLevel(level))}
            </Badge>
          )
        })}
      </div>

      {user.interestCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {user.interestCategories.slice(0, 4).map((cat) => (
            <span
              key={cat}
              className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs capitalize text-muted-foreground"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" nativeButton={false} render={<Link href={`/profile/${user.username}`} />}>
          <Users className="size-4" /> Profile
        </Button>
        <div className="flex-1">
          <AddFriendButton userId={user.id} initial={user.friendStatus} />
        </div>
      </div>
    </div>
  )
}

export default function ExplorePage() {
  const [query, setQuery] = useState("")
  const [country, setCountry] = useState("")
  const [language, setLanguage] = useState("")
  const [interest, setInterest] = useState("")
  const [users, setUsers] = useState<ExploreUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Pure I/O: fetches a page of results and touches no state. */
  const loadUsers = useCallback(
    async (q: string, c: string, l: string, i: string, p: number): Promise<ExploreResponse> => {
      const res = await fetch(buildUrl(q, c, l, i, p))
      if (!res.ok) throw new Error("Failed to load users")
      return res.json()
    },
    []
  )

  const applyResults = useCallback((data: ExploreResponse, append: boolean) => {
    setUsers((prev) => (append ? [...prev, ...data.users] : data.users))
    setTotal(data.total)
    setHasMore(data.hasMore)
  }, [])

  const fetchUsers = useCallback(
    async (q: string, c: string, l: string, i: string, p: number, append = false) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      try {
        applyResults(await loadUsers(q, c, l, i, p), append)
      } catch {
        if (!append) setUsers([])
      } finally {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [loadUsers, applyResults]
  )

  // `loading` already starts true, and every state update below happens in a
  // promise callback rather than synchronously in the effect body, which is
  // what avoids the cascading render on mount.
  useEffect(() => {
    loadUsers("", "", "", "", 1)
      .then((data) => applyResults(data, false))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [loadUsers, applyResults])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchUsers(val, country, language, interest, 1), 300)
  }

  function handleFilterChange(type: "country" | "language" | "interest", value: string) {
    const next = { country, language, interest, [type]: value }
    if (type === "country") setCountry(value)
    if (type === "language") setLanguage(value)
    if (type === "interest") setInterest(value)
    setPage(1)
    fetchUsers(query, next.country, next.language, next.interest, 1)
  }

  function loadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    fetchUsers(query, country, language, interest, nextPage, true)
  }

  const hasFilters = query || country || language || interest

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Find Partners</h1>
        <p className="text-sm text-muted-foreground">
          Discover people to practise with, or start a new match.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <MessageSquare className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Text Practice</h2>
            <p className="text-sm text-muted-foreground">
              Find a partner for an instant text conversation.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/match/chat" />}>Start</Button>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Video className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Live Practice</h2>
              <Badge variant="outline">Optional</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Practise live with camera and microphone controls.
            </p>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href="/match/video" />}>Choose</Button>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
            <Mic className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Voice Practice</h2>
            <p className="text-sm text-muted-foreground">
              Live audio conversation, no camera needed.
            </p>
          </div>
          <Button variant="outline" nativeButton={false} render={<Link href="/match/voice" />}>Choose</Button>
        </div>
      </section>

      {/* Search + filters */}
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={handleQueryChange}
              placeholder="Search by username or name…"
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
            />
          </div>

          <CountrySelector
            value={country}
            onChange={(val) => handleFilterChange("country", val)}
            placeholder="All countries"
            allowClear
            className="h-9 sm:w-52"
          />

          <select
            value={language}
            onChange={(e) => handleFilterChange("language", e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
          >
            <option value="">All languages</option>
            {LANGUAGES.map((l) => (
              // A native <option> can only contain text, so no flag here — and
              // an emoji flag would render as bare letters on Windows anyway.
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Interest chips */}
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map((i) => (
            <button
              key={i.key}
              type="button"
              onClick={() => handleFilterChange("interest", interest === i.key ? "" : i.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                interest === i.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </section>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, k) => (
            <UserCardSkeleton key={k} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Search className="size-10 text-muted-foreground/40" />
          <p className="font-medium">
            {hasFilters ? "No users match your search" : "No users found"}
          </p>
          {hasFilters && (
            <p className="text-sm text-muted-foreground">Try different keywords or filters</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "user" : "users"} found
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {users.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="size-4 animate-spin" /> : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
