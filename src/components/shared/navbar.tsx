"use client"

import Link from "next/link"
import { LogOut, Settings, User as UserIcon } from "lucide-react"
import { signOut } from "next-auth/react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
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
import { BrandMark } from "@/components/shared/brand-mark"
import { navInitials, type NavIdentity } from "@/components/shared/nav-identity"

export function Navbar({ identity }: { identity: NavIdentity }) {
  const { name: displayName, username, image } = identity
  const initials = navInitials(displayName)

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <BrandMark href="/dashboard" size="sm" className="lg:hidden" />

      <UserSearch />

      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-full")}
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
