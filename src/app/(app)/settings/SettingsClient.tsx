"use client"

import * as React from "react"
import { Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AIPreferencesForm } from "@/components/ai-preferences/AIPreferencesForm"
import { LanguageLevelPicker, type LanguageLevelEntry } from "@/components/language-level-picker"
import { getLanguage, LEARNING_LEVELS } from "@/constants/languages"
import type { AIProfile } from "@/types"
import {
  getCompletionPercentage,
  getFirstIncompleteStep,
  STEP_PATHS,
  type UserProfileData,
} from "@/lib/onboarding-progress"
import type { SettingsFormState } from "@/lib/settings-form-state"

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

/*
 * The interactive half of the settings page. Every starting value arrives as a
 * prop: this page used to render an empty form and then fill it in from
 * /api/user/me, so the fields visibly populated themselves after first paint.
 */
export function SettingsClient({
  initialState,
  initialProfile,
}: {
  initialState: SettingsFormState
  initialProfile: UserProfileData | null
}) {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = React.useState(initialState.avatarUrl)
  const [uploading, setUploading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [displayName, setDisplayName] = React.useState(initialState.displayName)
  const [username, setUsername] = React.useState(initialState.username)
  const [aiProfile, setAIProfile] = React.useState<Partial<AIProfile> | undefined>(
    initialState.aiProfile,
  )
  const [spoken, setSpoken] = React.useState<LanguageLevelEntry[]>(initialState.spoken)
  const [learning, setLearning] = React.useState<LanguageLevelEntry[]>(initialState.learning)
  const [explanationLanguage, setExplanationLanguage] = React.useState(
    initialState.explanationLanguage,
  )
  const [langSaving, setLangSaving] = React.useState(false)
  const [profileData, setProfileData] = React.useState<UserProfileData | null>(initialProfile)

  // Derived rather than stored: these used to be separate state that had to be
  // kept in step by hand every time the language list changed.
  const aiLearningLanguages = learning.map((language) => getLanguage(language.code))
  const completionPct = profileData ? getCompletionPercentage(profileData) : 0

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
      // The navigation renders the name and avatar from the server, so it only
      // catches up once this route is re-rendered.
      router.refresh()
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
    if (spoken.length === 0) { toast.error("Add at least one native language"); return }
    if (learning.length === 0) { toast.error("Add at least one target language"); return }
    if (!spoken.some((language) => language.code === explanationLanguage)) {
      toast.error("Choose an explanation language")
      return
    }
    setLangSaving(true)
    try {
      const languageProfile = {
        nativeLanguages: spoken.map((language) => language.code),
        learningLanguages: learning.map((language, index) => ({
          ...language,
          isPrimary: index === 0,
        })),
        preferredExplanationLanguage: explanationLanguage,
      }
      const res = await fetch("/api/user/me/language-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(languageProfile),
      })
      if (!res.ok) { toast.error("Failed to save languages"); return }
      setProfileData({ ...(profileData ?? {}), languageProfile })
      toast.success("Languages saved!")
    } catch {
      toast.error("Failed to save languages")
    } finally {
      setLangSaving(false)
    }
  }

  function handleNativeLanguagesChange(next: LanguageLevelEntry[]) {
    setSpoken(next)
    setExplanationLanguage((current) =>
      next.some((language) => language.code === current) ? current : (next[0]?.code ?? ""),
    )
  }

  const initials = displayName
    ? displayName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  return (
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
              <Input
                id="email"
                type="email"
                value={initialState.email}
                readOnly
                className="opacity-60"
              />
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
                <Label>My native languages</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add every language you grew up speaking fluently.
                </p>
              </div>
              <LanguageLevelPicker
                value={spoken}
                onChange={handleNativeLanguagesChange}
                levels={["native"]}
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
                defaultLevel="unsure"
                excludeCodes={spoken.map((s) => s.code)}
                placeholder="Add a language…"
              />
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="settings-explanation-language">Explain new concepts in</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Used for short tutor explanations when the target language is not enough.
                </p>
              </div>
              <select
                id="settings-explanation-language"
                value={explanationLanguage}
                onChange={(event) => setExplanationLanguage(event.target.value)}
                disabled={spoken.length === 0}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a language</option>
                {spoken.map(({ code }) => (
                  <option key={code} value={code}>{getLanguage(code).name}</option>
                ))}
              </select>
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
          interestTags={initialState.interestTags}
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
  )
}
