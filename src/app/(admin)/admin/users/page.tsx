"use client"

import * as React from "react"
import { Ban, CheckCircle, Search, Shield, ShieldOff, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type DBUser = {
  _id: string
  displayName: string
  username: string
  email: string
  avatar: string
  plan: "free" | "premium"
  role: "user" | "admin"
  isBanned: boolean
  isActive: boolean
  createdAt: string
  dailySessionCount: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<DBUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState("")
  const [plan, setPlan] = React.useState("all")
  const [status, setStatus] = React.useState("all")

  React.useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter((u) => {
    const q = query.toLowerCase()
    const matchesQuery =
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    const matchesPlan = plan === "all" || u.plan === plan
    const matchesStatus =
      status === "all" ||
      (status === "banned" && u.isBanned) ||
      (status === "active" && !u.isBanned)
    return matchesQuery && matchesPlan && matchesStatus
  })

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error("Failed")
    const updated: DBUser = await res.json()
    setUsers((prev) => prev.map((u) => (u._id === id ? updated : u)))
  }

  async function remove(id: string) {
    if (!confirm("Permanently delete this user?")) return
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete user")
      return
    }
    setUsers((prev) => prev.filter((u) => u._id !== id))
    toast.success("User deleted")
  }

  async function toggleBan(u: DBUser) {
    try {
      await patch(u._id, { isBanned: !u.isBanned, banReason: u.isBanned ? null : "Admin action" })
      toast.success(u.isBanned ? "User unbanned" : "User banned")
    } catch {
      toast.error("Action failed")
    }
  }

  async function toggleRole(u: DBUser) {
    try {
      await patch(u._id, { role: u.role === "admin" ? "user" : "admin" })
      toast.success(`Role updated to ${u.role === "admin" ? "user" : "admin"}`)
    } catch {
      toast.error("Action failed")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">User Management</h1>
        <p className="mt-1 text-muted-foreground">{users.length} total users</p>
      </div>

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

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Sessions</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => (
                <tr key={u._id} className="transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs">
                          {u.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{u.displayName}</p>
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
                    <Badge variant={u.role === "admin" ? "default" : "outline"} className="capitalize">
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                        u.isBanned
                          ? "bg-destructive/15 text-destructive"
                          : "bg-emerald-500/15 text-emerald-600"
                      )}
                    >
                      {u.isBanned ? "banned" : "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.dailySessionCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={u.isBanned ? "Unban" : "Ban"}
                        onClick={() => toggleBan(u)}
                        className={u.isBanned ? "text-emerald-600" : "text-destructive"}
                      >
                        {u.isBanned ? <CheckCircle className="size-4" /> : <Ban className="size-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={u.role === "admin" ? "Demote" : "Promote to admin"}
                        onClick={() => toggleRole(u)}
                        className="text-amber-500"
                      >
                        {u.role === "admin" ? <ShieldOff className="size-4" /> : <Shield className="size-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete"
                        onClick={() => remove(u._id)}
                        className="text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No users match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
