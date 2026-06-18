"use client"

import * as React from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type ContentBlock = {
  _id: string
  slug: string
  title: string
  body: string
  page: string
  isPublished: boolean
  updatedBy: string
  updatedAt: string
}

const EMPTY = { slug: "", title: "", body: "", page: "global", isPublished: true }

export default function AdminContentPage() {
  const [blocks, setBlocks] = React.useState<ContentBlock[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [pageFilter, setPageFilter] = React.useState("all")

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ContentBlock | null>(null)
  const [form, setForm] = React.useState(EMPTY)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((data) => setBlocks(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load content blocks"))
      .finally(() => setLoading(false))
  }, [])

  const pages = React.useMemo(() => {
    const set = new Set(blocks.map((b) => b.page))
    return ["all", ...Array.from(set).sort()]
  }, [blocks])

  const filtered = blocks.filter((b) => {
    const q = search.toLowerCase()
    return (
      (b.slug.includes(q) || b.title.toLowerCase().includes(q)) &&
      (pageFilter === "all" || b.page === pageFilter)
    )
  })

  function openCreate() {
    setForm(EMPTY)
    setCreateOpen(true)
  }

  function openEdit(block: ContentBlock) {
    setForm({
      slug: block.slug,
      title: block.title,
      body: block.body,
      page: block.page,
      isPublished: block.isPublished,
    })
    setEditTarget(block)
  }

  function closeDialogs() {
    setCreateOpen(false)
    setEditTarget(null)
    setForm(EMPTY)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to create")
        return
      }
      const created: ContentBlock = await res.json()
      setBlocks((prev) => [created, ...prev])
      toast.success("Content block created")
      closeDialogs()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/content/${editTarget.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          page: form.page,
          isPublished: form.isPublished,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to update")
        return
      }
      const updated: ContentBlock = await res.json()
      setBlocks((prev) => prev.map((b) => (b._id === updated._id ? updated : b)))
      toast.success("Content block updated")
      closeDialogs()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(block: ContentBlock) {
    if (!confirm(`Delete "${block.slug}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/content/${block.slug}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to delete"); return }
      setBlocks((prev) => prev.filter((b) => b._id !== block._id))
      toast.success("Content block deleted")
    } catch {
      toast.error("Failed to delete")
    }
  }

  const dialogOpen = createOpen || editTarget !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Content Manager</h1>
          <p className="mt-1 text-muted-foreground">{blocks.length} content blocks</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          New Block
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by slug or title…"
          className="h-9 flex-1"
        />
        <select
          value={pageFilter}
          onChange={(e) => setPageFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
        >
          {pages.map((p) => (
            <option key={p} value={p}>
              {p === "all" ? "All pages" : p}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Page</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((block) => (
                <tr key={block._id} className="transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {block.slug}
                  </td>
                  <td className="px-4 py-3 font-medium">{block.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{block.page}</td>
                  <td className="px-4 py-3">
                    <Badge variant={block.isPublished ? "default" : "secondary"}>
                      {block.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(block.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(block)}
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(block)}
                        aria-label="Delete"
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
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No content blocks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialogs() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {createOpen ? "New Content Block" : "Edit Content Block"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={createOpen ? handleCreate : handleEdit} className="space-y-3">
            {createOpen && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Slug</label>
                <Input
                  required
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="home-hero-title"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier — lowercase, hyphens only.
                </p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`space-y-1 ${createOpen ? "" : "sm:col-span-2"}`}>
                <label className="text-sm font-medium">Title</label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Hero Title"
                />
              </div>
              {createOpen && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Page</label>
                  <Input
                    value={form.page}
                    onChange={(e) => setForm((f) => ({ ...f, page: e.target.value }))}
                    placeholder="home"
                  />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Body</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Content body (supports HTML or Markdown)"
                rows={6}
                className="w-full rounded-lg border border-input bg-transparent p-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isPublished: e.target.checked }))
                }
                className="rounded"
              />
              Published
            </label>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={closeDialogs}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : createOpen ? "Create" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
