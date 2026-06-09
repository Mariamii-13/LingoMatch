"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Search, Loader2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SearchUser {
  _id: string
  username: string
  email: string
  displayName: string
  avatar: string
  country: string
}

export function UserSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(trimmed)}&limit=8`)
      if (!res.ok) throw new Error("search failed")
      const data = await res.json()
      setResults(data.users ?? [])
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(val), 300)
  }

  function handleClose() {
    setOpen(false)
    setQuery("")
    setResults([])
  }

  return (
    <div ref={containerRef} className="relative hidden w-64 sm:block">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim() && setOpen(true)}
          placeholder="Search users…"
          className="h-8 w-full rounded-lg border border-input bg-background/50 pl-8 pr-8 text-sm outline-none placeholder:text-muted-foreground transition-colors focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/20 dark:bg-input/30"
          aria-label="Search users"
          aria-expanded={open}
          aria-haspopup="listbox"
          role="combobox"
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-md"
        >
          {results.length === 0 ? (
            <p className="px-3 py-5 text-center text-sm text-muted-foreground">No users found</p>
          ) : (
            <ul>
              {results.map((user) => (
                <li key={user._id} role="option">
                  <Link
                    href={`/profile/${user.username}`}
                    onClick={handleClose}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent"
                  >
                    <Avatar className="size-8 shrink-0">
                      {user.avatar ? (
                        <AvatarImage src={user.avatar} alt={user.displayName} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-xs text-white">
                        {user.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">@{user.username}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    {user.country && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {user.country}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
