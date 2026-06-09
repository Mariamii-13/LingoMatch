"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { Search, Loader2, UserPlus, Users, Clock } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { languageOptions } from "@/lib/mock-data"

type FriendStatus = "none" | "pending" | "friends"

interface ExploreUser {
  _id: string
  username: string
  email: string
  displayName: string
  avatar: string
  country: string
  nativeLanguages: string[]
  learningLanguages: { code: string; level: string }[]
  friendStatus: FriendStatus
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
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  )
}

function AddFriendButton({
  userId,
  initial,
}: {
  userId: string
  initial: FriendStatus
}) {
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
      if (res.ok) setStatus("pending")
    } finally {
      setLoading(false)
    }
  }

  if (status === "friends") {
    return (
      <Button variant="secondary" size="sm" className="w-full" disabled>
        <Users className="size-4" /> Friends
      </Button>
    )
  }
  if (status === "pending") {
    return (
      <Button variant="secondary" size="sm" className="w-full" disabled>
        <Clock className="size-4" /> Request Sent
      </Button>
    )
  }
  return (
    <Button size="sm" className="w-full" onClick={handleAdd} disabled={loading}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <UserPlus className="size-4" />
      )}
      Add Friend
    </Button>
  )
}

function UserCard({ user }: { user: ExploreUser }) {
  const lang = languageOptions.find((l) => l.code === user.nativeLanguages[0])

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
      <Link href={`/profile/${user.username}`} className="flex items-start gap-3">
        <Avatar className="size-12 shrink-0">
          {user.avatar ? <AvatarImage src={user.avatar} alt={user.displayName} /> : null}
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-sm text-white">
            {user.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{user.displayName}</p>
          <p className="truncate text-sm text-muted-foreground">@{user.username}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-1.5">
        {user.country && (
          <Badge variant="secondary" className="text-xs">
            {user.country}
          </Badge>
        )}
        {lang && (
          <Badge variant="outline" className="text-xs">
            {lang.flag} {lang.name}
          </Badge>
        )}
        {user.learningLanguages.slice(0, 2).map((ll) => {
          const l = languageOptions.find((o) => o.code === ll.code)
          return l ? (
            <Badge key={ll.code} variant="outline" className="text-xs">
              {l.flag} {l.name}
            </Badge>
          ) : null
        })}
      </div>

      <AddFriendButton userId={user._id} initial={user.friendStatus} />
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
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchUsers = useCallback(
    async (q: string, c: string, l: string, i: string, p: number, append = false) => {
      setLoading(true)
      try {
        const res = await fetch(buildUrl(q, c, l, i, p))
        if (!res.ok) throw new Error()
        const data = await res.json()
        setUsers((prev) => (append ? [...prev, ...data.users] : data.users))
        setTotal(data.total)
        setHasMore(data.hasMore)
      } catch {
        if (!append) setUsers([])
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Initial load
  useEffect(() => {
    fetchUsers("", "", "", "", 1)
  }, [fetchUsers])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchUsers(val, country, language, interest, 1), 300)
  }

  function handleFilterChange(
    type: "country" | "language" | "interest",
    value: string
  ) {
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
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Explore</h1>
        <p className="text-sm text-muted-foreground">Discover language partners</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={handleQueryChange}
            placeholder="Search by username or email…"
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
          />
        </div>

        <select
          value={country}
          onChange={(e) => handleFilterChange("country", e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
        >
          <option value="">All countries</option>
          {[
            "USA", "UK", "Canada", "Australia", "Germany", "France",
            "Spain", "Japan", "South Korea", "Brazil", "Mexico",
            "India", "China", "Italy", "Netherlands",
          ].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={language}
          onChange={(e) => handleFilterChange("language", e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
        >
          <option value="">All languages</option>
          {languageOptions.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.name}
            </option>
          ))}
        </select>

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
      </div>

      {/* Results */}
      {loading && users.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, k) => (
            <UserCardSkeleton key={k} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Search className="size-10 text-muted-foreground/40" />
          <p className="font-medium">
            {hasFilters ? "No users match your search" : "No users yet"}
          </p>
          {hasFilters && (
            <p className="text-sm text-muted-foreground">Try different keywords or filters</p>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "user" : "users"} found
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {users.map((u) => (
              <UserCard key={u._id} user={u} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
