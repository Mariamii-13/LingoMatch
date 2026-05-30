"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, Lock, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { currentUser } from "@/lib/mock-data"

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
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="ai">AI Preferences</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        {/* Account */}
        <TabsContent value="account" className="mt-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="size-16">
                <AvatarFallback className={`bg-gradient-to-br ${currentUser.avatarColor} text-white text-lg`}>
                  {currentUser.avatarInitials}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">Change avatar</Button>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input id="name" defaultValue={currentUser.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" defaultValue={currentUser.username} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="alex@example.com" />
              </div>
            </div>
            <Button className="mt-6">Save changes</Button>
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
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              <h3 className="font-semibold">Private AI preferences</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              These help us match you better. Only AI can see them — never other users.
            </p>
            <Button variant="outline" className="mt-4" render={<Link href="/ai-preferences" />}>
              Re-do AI preferences <ArrowRight className="size-4" />
            </Button>
          </div>
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

        {/* Subscription */}
        <TabsContent value="subscription" className="mt-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <div>
                  <p className="font-semibold">Current plan</p>
                  <p className="text-sm text-muted-foreground capitalize">{currentUser.plan}</p>
                </div>
              </div>
              <Badge variant={currentUser.plan === "premium" ? "default" : "secondary"} className="capitalize">
                {currentUser.plan}
              </Badge>
            </div>

            <div className="mt-6 rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between text-sm">
                <span>Conversations this month</span>
                <span className="font-medium">Unlimited</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Renews on</span>
                <span className="font-medium">Jun 30, 2026</span>
              </div>
            </div>

            <Button className="mt-6" render={<Link href="/subscription" />}>
              Manage subscription
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
