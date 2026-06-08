"use client"

import * as React from "react"
import Image from "next/image"
import { FileAudio, ImageIcon, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type UploadUser = {
  displayName: string
  username: string
  email: string
  avatar: string
}

type Upload = {
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
  const [uploads, setUploads] = React.useState<Upload[]>([])
  const [loading, setLoading] = React.useState(true)
  const [query, setQuery] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState("all")

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">File Management</h1>
        <p className="mt-1 text-muted-foreground">{uploads.length} total uploads</p>
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
    </div>
  )
}
