"use client"

import * as React from "react"
import { Ban, Eye, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { adminUsers } from "@/lib/mock-data"

export default function AdminUsersPage() {
  const [query, setQuery] = React.useState("")
  const [plan, setPlan] = React.useState("all")
  const [status, setStatus] = React.useState("all")

  const filtered = adminUsers.filter((u) => {
    const matchesQuery =
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.username.toLowerCase().includes(query.toLowerCase())
    const matchesPlan = plan === "all" || u.plan === plan
    const matchesStatus = status === "all" || u.status === status
    return matchesQuery && matchesPlan && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">User Management</h1>
        <p className="mt-1 text-muted-foreground">{adminUsers.length} total users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or username"
            className="h-9 pl-8"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
        >
          <option value="all">All plans</option>
          <option value="free">Free</option>
          <option value="premium">Premium</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Sessions</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-accent/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar size="sm">
                      <AvatarFallback className={`bg-gradient-to-br ${u.color} text-white text-xs`}>
                        {u.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.plan === "premium" ? "default" : "secondary"} className="capitalize">
                    {u.plan}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      u.status === "active"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-destructive/15 text-destructive"
                    )}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3">{u.sessions}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.joined}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label="View">
                      <Eye className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Ban" className="text-destructive">
                      <Ban className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No users match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
