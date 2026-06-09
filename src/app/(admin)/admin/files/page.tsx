"use client"

import * as React from "react"
import Image from "next/image"
import { FileAudio, ImageIcon, Plus, Search, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type UploadUser = {
  _id: string
  displayName: string
  username: string
  email: string
  avatar: string
}

type UploadRecord = {
  _id: string
  userId: UploadUser
  publicId: string
  url: string
  type: "avatar" | "voice"
  size: number
  createdAt: string
}

function formatBytes(bytes: number) {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AdminFilesPage() {
  const [uploads, setUploads] = React.useState<UploadRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")

  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [targetUserId, setTargetUserId] = React.useState("")
  const [uploadType, setUploadType] = React.useState<"avatar" | "voice">("avatar")
  const [file, setFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)

  React.useEffect(() => {
    fetch("/api/admin/uploads")
      .then((r) => r.json())
      .then((data) => setUploads(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = uploads.filter((u) => {
    const q = query.toLowerCase()
    const matchesQuery =
      u.userId?.displayName?.toLowerCase().includes(q) ||
      u.userId?.username?.toLowerCase().includes(q) ||
      u.userId?.email?.toLowerCase().includes(q)
    const matchesType = typeFilter === "all" || u.type === typeFilter
    return matchesQuery && matchesType
  })

  async function remove(id: string) {
    if (!confirm("Delete this file from Cloudinary and clear from user profile?")) return
    const res = await fetch(`/api/admin/uploads/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete file")
      return
    }
    setUploads((prev) => prev.filter((u) => u._id !== id))
    toast.success("File deleted")
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !targetUserId) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("userId", targetUserId)
      fd.append("type", uploadType)

      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? "Upload failed")
        return
      }
      const newUpload: UploadRecord = await res.json()
      setUploads((prev) => [newUpload, ...prev])
      toast.success("File uploaded")
      setUploadOpen(false)
      setFile(null)
      setTargetUserId("")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">File Management</h1>
          <p className="mt-1 text-muted-foreground">{uploads.length} total uploads</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Upload File
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by user name, username or email"
            className="h-9 pl-8"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
        >
          <option value="all">All types</option>
          <option value="avatar">Avatars</option>
          <option value="voice">Voice intros</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center shadow-sm">
          <p className="text-muted-foreground">No uploads found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Preview</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((upload) => (
                <tr key={upload._id} className="transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3">
                    {upload.type === "avatar" ? (
                      <div className="size-10 overflow-hidden rounded-lg border bg-muted">
                        <Image
                          src={upload.url}
                          alt="avatar"
                          width={40}
                          height={40}
                          className="size-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
                        <FileAudio className="size-5 text-muted-foreground" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{upload.userId?.displayName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">@{upload.userId?.username}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="gap-1">
                      {upload.type === "avatar" ? (
                        <ImageIcon className="size-3" />
                      ) : (
                        <FileAudio className="size-3" />
                      )}
                      {upload.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatBytes(upload.size)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(upload.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete file"
                        onClick={() => remove(upload._id)}
                        className="text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">User MongoDB ID</label>
              <Input
                required
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="507f1f77bcf86cd799439011"
              />
              <p className="text-xs text-muted-foreground">Find IDs in Users table</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">File Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as "avatar" | "voice")}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                <option value="avatar">Avatar (image, max 2MB)</option>
                <option value="voice">Voice intro (audio, max 5MB)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">File</label>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input p-6 text-center transition-colors hover:border-primary/50">
                <Upload className="size-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {file ? file.name : "Click to select file"}
                </span>
                <input
                  type="file"
                  className="sr-only"
                  accept={uploadType === "avatar" ? "image/*" : "audio/*"}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading || !file}>
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
