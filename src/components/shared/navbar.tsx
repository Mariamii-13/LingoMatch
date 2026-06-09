"use client"

import Link from "next/link"
import { Bell, LogOut, Mic, Settings, User as UserIcon } from "lucide-react"
import { signOut, useSession } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { UserSearch } from "@/components/shared/user-search"

export function Navbar() {
  const { data: session } = useSession()
  const displayName = session?.user?.name ?? "User"
  const username = (session?.user as { username?: string })?.username ?? "me"
  const image = session?.user?.image ?? ""
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Mic className="size-4" />
        </span>
        <span className="text-base font-semibold">LingoMatch</span>
      </Link>

      <UserSearch />

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />

        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-5" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu" />
            }
          >
            <Avatar>
              {image ? <AvatarImage src={image} alt={displayName} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{displayName}</span>
                <span className="text-xs text-muted-foreground">@{username}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href={`/profile/${username}`} />}>
              <UserIcon className="size-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>
              <Settings className="size-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="size-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
