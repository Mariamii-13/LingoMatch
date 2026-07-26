"use client"

import * as React from "react"
import { Upload } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AIPreferencesForm } from "@/components/ai-preferences/AIPreferencesForm"
import { LanguageLevelPicker, type LanguageLevelEntry } from "@/components/language-level-picker"
import { getLanguage, SPOKEN_LEVELS, LEARNING_LEVELS } from "@/constants/languages"
import type { AIProfile } from "@/types"
import { useRouter } from "next/navigation"
import {
  getCompletionPercentage,
  getFirstIncompleteStep,
  STEP_PATHS,
  type UserProfileData,
} from "@/lib/onboarding-progress"

const MAX_BYTES = 2 * 1024 * 1024 // 2MB

function SettingRow({
  title,
  description,
  defaultChecked,
}: {
  title: string
  description: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = React.useState("")
  const [uploading, setUploading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [displayName, setDisplayName] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [aiProfile, setAIProfile] = React.useState<Partial<AIProfile>>()
  const [aiLearningLanguages, setAILearningLanguages] = React.useState<
    { code: string; name: string; flag: string }[]
  >([])
  const [aiInterestTags, setAIInterestTags] = React.useState<string[]>([])
  const [spoken, setSpoken] = React.useState<LanguageLevelEntry[]>([])
  const [learning, setLearning] = React.useState<LanguageLevelEntry[]>([])
  const [langSaving, setLangSaving] = React.useState(false)
  const router = useRouter()
  const [completionPct, setCompletionPct] = React.useState(0)
  const [profileData, setProfileData] = React.useState<UserProfileData | null>(null)

  React.useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((u) => {
        setAvatarUrl(u.avatar ?? "")
        setDisplayName(u.displayName ?? "")
        setUsername(u.username ?? "")
        setEmail(u.email ?? "")
        if (u.aiProfile) setAIProfile(u.aiProfile)
        if (u.spokenLanguages?.length) setSpoken(u.spokenLanguages as LanguageLevelEntry[])
        if (u.learningLanguages?.length) {
          const ll = u.learningLanguages as LanguageLevelEntry[]
          setLearning(ll)
          setAILearningLanguages(ll.map((l) => getLanguage(l.code)))
        }
        if (u.interests) {
          const tags = Object.values(u.interests as Record<string, string[]>).flat()
          setAIInterestTags(tags)
        }
        setProfileData(u as UserProfileData)
        setCompletionPct(getCompletionPercentage(u as UserProfileData))
      })
      .catch(() => {})
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files allowed.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error("File too large. Max 2MB.")
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload/avatar", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed. Please try again.")
        return
      }
      setAvatarUrl(data.url)
      toast.success("Avatar updated!")
    } catch {
      toast.error("Upload failed. Please try again.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSave() {
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), username: username.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save changes.")
        return
      }
      toast.success("Changes saved!")
    } catch {
      toast.error("Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }

  async function handleAISave(profile: AIProfile) {
    const res = await fetch("/api/user/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiProfile: profile }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save AI preferences")
      throw new Error("Save failed")
    }
    setAIProfile(profile)
    toast.success("AI preferences saved!")
  }

  async function handleAIReset() {
    const res = await fetch("/api/user/me/ai-profile", { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to reset preferences")
      throw new Error("Reset failed")
    }
    setAIProfile(undefined)
    toast.success("AI preferences reset to defaults.")
  }

  async function handleAIDelete() {
    const res = await fetch("/api/user/me/ai-profile", { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete AI preference data")
      throw new Error("Delete failed")
    }
    setAIProfile(undefined)
    toast.success("AI preference data deleted.")
  }

  async function handleLangSave() {
    if (spoken.length === 0) { toast.error("Add at least one language you speak"); return }
    setLangSaving(true)
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spokenLanguages: spoken, learningLanguages: learning }),
      })
      if (!res.ok) { toast.error("Failed to save languages"); return }
      setAILearningLanguages(learning.map((l) => getLanguage(l.code)))
      toast.success("Languages saved!")
    } catch {
      toast.error("Failed to save languages")
    } finally {
      setLangSaving(false)
    }
  }

  const initials = displayName
    ? displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : session?.user?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account, privacy and preferences.
        </p>
      </div>

      <Tabs defaultValue="account">
        <TabsList className="flex-wrap">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="languages">Languages</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="ai">AI Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="setup" className="relative">
            {completionPct < 100 && (
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary" />
            )}
            {completionPct < 100
              ? `Complete Profile (${completionPct}% complete)`
              : `Profile Setup (100% complete)`}
          </TabsTrigger>
        </TabsList>

        {/* Account */}
        <TabsContent value="account" className="mt-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="size-16">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <span className="mr-2 size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 size-3.5" />
                    Change avatar
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">JPG, PNG, GIF · max 2MB</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} readOnly className="opacity-60" />
              </div>
            </div>
            <Button className="mt-6" disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </TabsContent>

        {/* Languages */}
        <TabsContent value="languages" className="mt-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-6">
              <div className="space-y-3">
                <div>
                  <Label>Languages I speak</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Include your native language and any others you speak well.
                  </p>
                </div>
                <LanguageLevelPicker
                  value={spoken}
                  onChange={setSpoken}
                  levels={SPOKEN_LEVELS}
                  defaultLevel="native"
                  placeholder="Add a language…"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Languages I&apos;m learning</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Languages you are currently learning or plan to study.
                  </p>
                </div>
                <LanguageLevelPicker
                  value={learning}
                  onChange={setLearning}
                  levels={LEARNING_LEVELS}
                  defaultLevel="beginner"
                  excludeCodes={spoken.map((s) => s.code)}
                  placeholder="Add a language…"
                />
              </div>

              <Button onClick={handleLangSave} disabled={langSaving}>
                {langSaving ? "Saving…" : "Save languages"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Privacy */}
        <TabsContent value="privacy" className="mt-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="visibility">Who can see your profile</Label>
              <select
                id="visibility"
                className="h-9 w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring dark:bg-input/30"
              >
                <option>Everyone</option>
                <option>Friends only</option>
                <option>No one</option>
              </select>
            </div>
            <div className="mt-2 divide-y">
              <SettingRow
                title="Private mode"
                description="Hide your online status and activity from others."
              />
              <SettingRow
                title="Show country flag"
                description="Display your country on your public profile."
                defaultChecked
              />
              <SettingRow
                title="Allow friend requests"
                description="Let other speakers send you connection requests."
                defaultChecked
              />
            </div>
          </div>
        </TabsContent>

        {/* AI Preferences */}
        <TabsContent value="ai" className="mt-6">
          <AIPreferencesForm
            initialProfile={aiProfile}
            learningLanguages={aiLearningLanguages}
            interestTags={aiInterestTags}
            mode="settings"
            onSave={handleAISave}
            onReset={handleAIReset}
            onDelete={handleAIDelete}
          />
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm divide-y">
            <SettingRow title="New match found" description="When a partner is ready for you." defaultChecked />
            <SettingRow title="Friend requests" description="When someone wants to connect." defaultChecked />
            <SettingRow title="Scheduled session reminders" description="15 minutes before a session." defaultChecked />
            <SettingRow title="Weekly AI insights" description="Your progress report every Monday." defaultChecked />
            <SettingRow title="Product updates" description="News about new features." />
          </div>
        </TabsContent>

        {/* Profile Setup */}
        <TabsContent value="setup" className="mt-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-lg">
              {completionPct < 100 ? "Complete Your Profile" : "Profile Setup"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {completionPct < 100
                ? "Finish setting up your profile to improve matching and recommendations."
                : "Your profile is complete. You can revisit any section to make changes."}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  if (!profileData) return
                  const next = getFirstIncompleteStep(profileData)
                  if (next) {
                    router.push(`${STEP_PATHS[next]}?from=settings`)
                  } else {
                    router.push(`/profile?from=settings`)
                  }
                }}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {completionPct < 100 ? "Continue Setup" : "Edit Profile Setup"}
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
