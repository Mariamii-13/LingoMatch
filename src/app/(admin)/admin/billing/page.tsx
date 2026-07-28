"use client"

import * as React from "react"
import { Plus, Pencil, Trash2, CreditCard, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type BillingUser = {
  _id: string
  displayName: string
  email: string
  username: string
  avatar: string
  plan: "free" | "premium"
  planExpiry: string | null
  stripeCustomerId: string | null
  createdAt: string
}

type UsersResult = {
  users: BillingUser[]
  total: number
  page: number
  limit: number
  pages: number
}

type PricingPlan = {
  _id: string
  name: string
  planKey: string
  description: string
  price: number
  currency: string
  interval: string
  features: string[]
  isActive: boolean
  stripePriceId: string | null
  maxDailySessions: number
  sortOrder: number
}

const EMPTY_PLAN = {
  name: "",
  planKey: "",
  description: "",
  price: 0,
  currency: "USD",
  interval: "month",
  features: "",
  isActive: true,
  stripePriceId: "",
  maxDailySessions: 3,
  sortOrder: 0,
}

export default function AdminBillingPage() {
  // ── User billing ──────────────────────────────────────────────────────────
  const [usersResult, setUsersResult] = React.useState<UsersResult | null>(null)
  const [loadedUsersKey, setLoadedUsersKey] = React.useState<string | null>(null)
  const [planFilter, setPlanFilter] = React.useState("all")
  const [userPage, setUserPage] = React.useState(1)

  const [editUserTarget, setEditUserTarget] = React.useState<BillingUser | null>(null)
  const [editPlan, setEditPlan] = React.useState<"free" | "premium">("free")
  const [editExpiry, setEditExpiry] = React.useState("")
  const [editStripeId, setEditStripeId] = React.useState("")
  const [userSubmitting, setUserSubmitting] = React.useState(false)

  // ── Pricing plans ─────────────────────────────────────────────────────────
  const [plans, setPlans] = React.useState<PricingPlan[]>([])
  const [plansLoading, setPlansLoading] = React.useState(true)
  const [planCreateOpen, setPlanCreateOpen] = React.useState(false)
  const [planEditTarget, setPlanEditTarget] = React.useState<PricingPlan | null>(null)
  const [planForm, setPlanForm] = React.useState(EMPTY_PLAN)
  const [planSubmitting, setPlanSubmitting] = React.useState(false)

  // ── Load users ────────────────────────────────────────────────────────────
  // Identifies which page+filter the held users belong to, so loading is derived
  // instead of tracked by a flag set synchronously in the effect.
  const usersKey = `${userPage}:${planFilter}`
  const usersLoading = loadedUsersKey !== usersKey

  React.useEffect(() => {
    // Changing filter and page quickly must not let an earlier response land last.
    let cancelled = false
    const params = new URLSearchParams({ page: String(userPage) })
    if (planFilter !== "all") params.set("plan", planFilter)
    fetch(`/api/admin/billing?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setUsersResult(data)
        setLoadedUsersKey(usersKey)
      })
      .catch(() => {
        if (cancelled) return
        toast.error("Failed to load users")
        setLoadedUsersKey(usersKey)
      })
    return () => {
      cancelled = true
    }
  }, [userPage, planFilter, usersKey])

  // ── Load plans ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    fetch("/api/admin/plans")
      .then((r) => r.json())
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load pricing plans"))
      .finally(() => setPlansLoading(false))
  }, [])

  // ── User billing handlers ─────────────────────────────────────────────────
  function openEditUser(user: BillingUser) {
    setEditUserTarget(user)
    setEditPlan(user.plan)
    setEditExpiry(user.planExpiry ? user.planExpiry.slice(0, 10) : "")
    setEditStripeId(user.stripeCustomerId ?? "")
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editUserTarget) return
    setUserSubmitting(true)
    try {
      const res = await fetch(`/api/admin/billing/${editUserTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: editPlan,
          planExpiry: editExpiry || null,
          stripeCustomerId: editStripeId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to update")
        return
      }
      const updated: BillingUser = await res.json()
      setUsersResult((prev) =>
        prev
          ? { ...prev, users: prev.users.map((u) => (u._id === updated._id ? updated : u)) }
          : null
      )
      toast.success("User billing updated")
      setEditUserTarget(null)
    } finally {
      setUserSubmitting(false)
    }
  }

  // ── Plan CRUD handlers ────────────────────────────────────────────────────
  function openCreatePlan() {
    setPlanForm(EMPTY_PLAN)
    setPlanCreateOpen(true)
  }

  function openEditPlan(plan: PricingPlan) {
    setPlanForm({
      name: plan.name,
      planKey: plan.planKey,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      features: plan.features.join("\n"),
      isActive: plan.isActive,
      stripePriceId: plan.stripePriceId ?? "",
      maxDailySessions: plan.maxDailySessions,
      sortOrder: plan.sortOrder,
    })
    setPlanEditTarget(plan)
  }

  function closePlanDialogs() {
    setPlanCreateOpen(false)
    setPlanEditTarget(null)
    setPlanForm(EMPTY_PLAN)
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault()
    setPlanSubmitting(true)
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...planForm,
          features: planForm.features
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
          stripePriceId: planForm.stripePriceId || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to create plan")
        return
      }
      const created: PricingPlan = await res.json()
      setPlans((prev) =>
        [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder)
      )
      toast.success("Plan created")
      closePlanDialogs()
    } finally {
      setPlanSubmitting(false)
    }
  }

  async function handleEditPlan(e: React.FormEvent) {
    e.preventDefault()
    if (!planEditTarget) return
    setPlanSubmitting(true)
    try {
      const res = await fetch(`/api/admin/plans/${planEditTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planForm.name,
          description: planForm.description,
          price: planForm.price,
          currency: planForm.currency,
          interval: planForm.interval,
          features: planForm.features
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
          isActive: planForm.isActive,
          stripePriceId: planForm.stripePriceId || null,
          maxDailySessions: planForm.maxDailySessions,
          sortOrder: planForm.sortOrder,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to update plan")
        return
      }
      const updated: PricingPlan = await res.json()
      setPlans((prev) =>
        prev
          .map((p) => (p._id === updated._id ? updated : p))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      )
      toast.success("Plan updated")
      closePlanDialogs()
    } finally {
      setPlanSubmitting(false)
    }
  }

  async function handleDeletePlan(plan: PricingPlan) {
    if (
      !confirm(
        `Delete plan "${plan.name}"? This does not affect existing user subscriptions.`
      )
    )
      return
    try {
      const res = await fetch(`/api/admin/plans/${plan._id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to delete plan"); return }
      setPlans((prev) => prev.filter((p) => p._id !== plan._id))
      toast.success("Plan deleted")
    } catch {
      toast.error("Failed to delete plan")
    }
  }

  const activePlanForm = planCreateOpen || planEditTarget !== null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Billing & Plans</h1>
        <p className="mt-1 text-muted-foreground">
          Manage user subscriptions and pricing plans.
        </p>
      </div>

      {/* ── User subscriptions ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">User Subscriptions</h2>
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setUserPage(1) }}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
          >
            <option value="all">All plans</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          {usersLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Expiry</th>
                  <th className="px-4 py-3 font-medium">Stripe ID</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {usersResult?.users.map((user) => (
                  <tr key={user._id} className="transition-colors hover:bg-accent/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-xs">
                            {user.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium leading-none">{user.displayName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={user.plan === "premium" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {user.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.planExpiry
                        ? new Date(user.planExpiry).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                      {user.stripeCustomerId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditUser(user)}
                        aria-label="Edit billing"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {usersResult?.users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {usersResult && usersResult.pages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {usersResult.total} users · Page {usersResult.page} of {usersResult.pages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={userPage <= 1}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() =>
                  setUserPage((p) => Math.min(usersResult.pages, p + 1))
                }
                disabled={userPage >= usersResult.pages}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── Pricing plans ────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pricing Plans</h2>
          <Button size="sm" onClick={openCreatePlan} className="gap-1.5">
            <Plus className="size-4" />
            New Plan
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plansLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
              Loading plans…
            </div>
          ) : plans.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
              No pricing plans yet.
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan._id}
                className={cn(
                  "rounded-xl border bg-card p-5 shadow-sm",
                  !plan.isActive && "opacity-60"
                )}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{plan.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{plan.planKey}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditPlan(plan)}
                      aria-label="Edit plan"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeletePlan(plan)}
                      aria-label="Delete plan"
                      className="text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mb-3 text-2xl font-bold">
                  {plan.price === 0 ? "Free" : `${plan.currency} ${plan.price}`}
                  {plan.price > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.interval}
                    </span>
                  )}
                </p>
                {plan.description && (
                  <p className="mb-3 text-sm text-muted-foreground">{plan.description}</p>
                )}
                {plan.features.length > 0 && (
                  <ul className="mb-3 space-y-1 text-sm">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{plan.maxDailySessions} sessions/day</span>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {plan.stripePriceId && (
                  <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
                    <CreditCard className="mr-1 inline size-3" />
                    {plan.stripePriceId}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Edit user billing dialog ─────────────────────────────────────── */}
      <Dialog
        open={editUserTarget !== null}
        onOpenChange={(v) => { if (!v) setEditUserTarget(null) }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Billing — {editUserTarget?.displayName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Plan</label>
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value as "free" | "premium")}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Plan Expiry</label>
              <Input
                type="date"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Leave blank for no expiry.</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Stripe Customer ID</label>
              <Input
                value={editStripeId}
                onChange={(e) => setEditStripeId(e.target.value)}
                placeholder="cus_xxxxxxxxxxxxxxxx"
                className="font-mono text-sm"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditUserTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={userSubmitting}>
                {userSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Create / Edit pricing plan dialog ───────────────────────────── */}
      <Dialog open={activePlanForm} onOpenChange={(v) => { if (!v) closePlanDialogs() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {planCreateOpen ? "New Pricing Plan" : `Edit — ${planEditTarget?.name}`}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={planCreateOpen ? handleCreatePlan : handleEditPlan}
            className="space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Plan Name</label>
                <Input
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Premium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Plan Key</label>
                <Input
                  required
                  value={planForm.planKey}
                  onChange={(e) => setPlanForm((f) => ({ ...f, planKey: e.target.value }))}
                  placeholder="premium"
                  disabled={!planCreateOpen}
                  className="font-mono text-sm disabled:opacity-60"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={planForm.description}
                onChange={(e) =>
                  setPlanForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Unlimited language practice sessions"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Price</label>
                <Input
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  value={planForm.price}
                  onChange={(e) =>
                    setPlanForm((f) => ({ ...f, price: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Currency</label>
                <Input
                  value={planForm.currency}
                  onChange={(e) =>
                    setPlanForm((f) => ({
                      ...f,
                      currency: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="USD"
                  maxLength={3}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Interval</label>
                <select
                  value={planForm.interval}
                  onChange={(e) =>
                    setPlanForm((f) => ({ ...f, interval: e.target.value }))
                  }
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
                >
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Features</label>
              <textarea
                value={planForm.features}
                onChange={(e) =>
                  setPlanForm((f) => ({ ...f, features: e.target.value }))
                }
                placeholder={"Unlimited sessions\nPriority support\nCustom avatar"}
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              />
              <p className="text-xs text-muted-foreground">One feature per line.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Max Sessions/Day</label>
                <Input
                  type="number"
                  min={0}
                  value={planForm.maxDailySessions}
                  onChange={(e) =>
                    setPlanForm((f) => ({
                      ...f,
                      maxDailySessions: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  type="number"
                  value={planForm.sortOrder}
                  onChange={(e) =>
                    setPlanForm((f) => ({
                      ...f,
                      sortOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={planForm.isActive}
                    onChange={(e) =>
                      setPlanForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    className="rounded"
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Stripe Price ID</label>
              <Input
                value={planForm.stripePriceId}
                onChange={(e) =>
                  setPlanForm((f) => ({ ...f, stripePriceId: e.target.value }))
                }
                placeholder="price_xxxxxxxxxxxxxxxx"
                className="font-mono text-sm"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={closePlanDialogs}>
                Cancel
              </Button>
              <Button type="submit" disabled={planSubmitting}>
                {planSubmitting
                  ? "Saving…"
                  : planCreateOpen
                  ? "Create Plan"
                  : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
