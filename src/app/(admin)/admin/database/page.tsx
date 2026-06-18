"use client"

import * as React from "react"
import { Database, Plus, Pencil, Trash2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type CollectionInfo = { name: string; count: number }
type MongoDoc = Record<string, unknown> & { _id: string }
type DocsResult = { docs: MongoDoc[]; total: number; page: number; limit: number; pages: number }

export default function AdminDatabasePage() {
  const [collections, setCollections] = React.useState<CollectionInfo[]>([])
  const [collectionsLoading, setCollectionsLoading] = React.useState(true)

  const [selected, setSelected] = React.useState<string | null>(null)
  const [docsResult, setDocsResult] = React.useState<DocsResult | null>(null)
  const [docsLoading, setDocsLoading] = React.useState(false)
  const [page, setPage] = React.useState(1)

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<MongoDoc | null>(null)
  const [jsonInput, setJsonInput] = React.useState("")
  const [jsonError, setJsonError] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  function loadCollections() {
    setCollectionsLoading(true)
    fetch("/api/admin/db")
      .then((r) => r.json())
      .then((data) => setCollections(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load collections"))
      .finally(() => setCollectionsLoading(false))
  }

  React.useEffect(() => { loadCollections() }, [])

  React.useEffect(() => {
    if (!selected) return
    setDocsLoading(true)
    setDocsResult(null)
    fetch(`/api/admin/db/${selected}?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((data) => setDocsResult(data))
      .catch(() => toast.error("Failed to load documents"))
      .finally(() => setDocsLoading(false))
  }, [selected, page])

  function selectCollection(name: string) {
    setSelected(name)
    setPage(1)
  }

  function closeDialogs() {
    setCreateOpen(false)
    setEditTarget(null)
    setJsonInput("")
    setJsonError("")
  }

  function validateJson(value: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setJsonError("Must be a JSON object { }")
        return null
      }
      setJsonError("")
      return parsed
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON")
      return null
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    const parsed = validateJson(jsonInput)
    if (!parsed) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/db/${selected}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to create document")
        return
      }
      const created: MongoDoc = await res.json()
      setDocsResult((prev) =>
        prev ? { ...prev, docs: [created, ...prev.docs], total: prev.total + 1 } : null
      )
      loadCollections()
      toast.success("Document created")
      closeDialogs()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !editTarget) return
    const parsed = validateJson(jsonInput)
    if (!parsed) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/db/${selected}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Failed to update document")
        return
      }
      const updated: MongoDoc = await res.json()
      setDocsResult((prev) =>
        prev
          ? { ...prev, docs: prev.docs.map((d) => (d._id === updated._id ? updated : d)) }
          : null
      )
      toast.success("Document updated")
      closeDialogs()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(doc: MongoDoc) {
    if (!selected || !confirm("Permanently delete this document?")) return
    try {
      const res = await fetch(`/api/admin/db/${selected}?id=${doc._id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to delete"); return }
      setDocsResult((prev) =>
        prev
          ? { ...prev, docs: prev.docs.filter((d) => d._id !== doc._id), total: prev.total - 1 }
          : null
      )
      loadCollections()
      toast.success("Document deleted")
    } catch {
      toast.error("Failed to delete")
    }
  }

  const dialogOpen = createOpen || editTarget !== null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Database Browser</h1>
        <p className="mt-1 text-muted-foreground">
          CRUD operations on whitelisted MongoDB collections.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Collection list */}
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold">Collections</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={loadCollections}
              aria-label="Refresh"
            >
              <RefreshCw className={`size-3.5 ${collectionsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="p-2">
            {collections.map((col) => (
              <button
                key={col.name}
                onClick={() => selectCollection(col.name)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  selected === col.name
                    ? "bg-amber-500 font-medium text-zinc-950"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Database className="size-3.5 shrink-0" />
                  {col.name}
                </span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {col.count}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Document browser */}
        <div className="min-w-0 rounded-xl border bg-card shadow-sm">
          {!selected ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Select a collection to browse documents.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b px-4 py-3">
                <span className="font-semibold">{selected}</span>
                <Button
                  size="sm"
                  onClick={() => {
                    setJsonInput("{\n  \n}")
                    setJsonError("")
                    setCreateOpen(true)
                  }}
                  className="h-7 gap-1 text-xs"
                >
                  <Plus className="size-3" />
                  New
                </Button>
              </div>

              <div className="overflow-x-auto">
                {docsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Loading…
                  </div>
                ) : docsResult?.docs.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No documents found.
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="px-4 py-2 font-medium">_id</th>
                        <th className="px-4 py-2 font-medium">Preview</th>
                        <th className="px-4 py-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {docsResult?.docs.map((doc) => {
                        const previewKeys = Object.keys(doc)
                          .filter((k) => k !== "_id")
                          .slice(0, 3)
                        const preview = previewKeys
                          .map(
                            (k) =>
                              `${k}: ${JSON.stringify(doc[k])?.slice(0, 30) ?? ""}${
                                JSON.stringify(doc[k])?.length ?? 0 > 30 ? "…" : ""
                              }`
                          )
                          .join("  |  ")
                        return (
                          <tr
                            key={String(doc._id)}
                            className="transition-colors hover:bg-accent/50"
                          >
                            <td className="px-4 py-2 font-mono text-muted-foreground">
                              …{String(doc._id).slice(-8)}
                            </td>
                            <td className="max-w-xs truncate px-4 py-2 text-muted-foreground">
                              {preview}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => {
                                    setJsonInput(JSON.stringify(doc, null, 2))
                                    setJsonError("")
                                    setEditTarget(doc)
                                  }}
                                  aria-label="Edit"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDelete(doc)}
                                  aria-label="Delete"
                                  className="text-destructive"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {docsResult && docsResult.pages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {docsResult.total} docs · Page {docsResult.page} of {docsResult.pages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        setPage((p) => Math.min(docsResult.pages, p + 1))
                      }
                      disabled={page >= docsResult.pages}
                    >
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialogs() }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {createOpen ? `New document in ${selected}` : "Edit document"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={createOpen ? handleCreate : handleEdit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">JSON Document</label>
              <textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value)
                  if (jsonError) validateJson(e.target.value)
                }}
                rows={14}
                spellCheck={false}
                className="w-full rounded-lg border border-input bg-transparent p-3 font-mono text-xs outline-none focus-visible:border-ring dark:bg-input/30"
              />
              {jsonError && (
                <p className="text-xs text-destructive">{jsonError}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={closeDialogs}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !!jsonError}>
                {submitting ? "Saving…" : createOpen ? "Create" : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
