"use client"

import * as React from "react"
import Link from "next/link"
import { Camera } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { countries } from "@/lib/mock-data"

export default function OnboardingProfilePage() {
  const [name, setName] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [country, setCountry] = React.useState("")
  const [bio, setBio] = React.useState("")

  return (
    <div>
      <h1 className="text-2xl font-semibold">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        This is what other speakers will see.
      </p>

      <div className="mt-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            className="group relative flex size-24 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted transition-colors hover:border-primary"
          >
            <Camera className="size-7 text-muted-foreground group-hover:text-primary" />
          </button>
          <span className="text-xs text-muted-foreground">Upload a photo</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="flex items-center rounded-lg border border-input pl-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
            <span className="text-sm text-muted-foreground">@</span>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alexr"
              className="border-0 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            <option value="">Select your country</option>
            {countries.map((c) => (
              <option key={c.name} value={c.name}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people a little about yourself..."
            rows={4}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button render={<Link href="/ai-preferences" />}>Continue</Button>
      </div>
    </div>
  )
}
