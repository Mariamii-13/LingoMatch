"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bot,
  Compass,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  RotateCcw,
  Settings,
  Shield,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BrandMark } from "@/components/shared/brand-mark"
import { navInitials, type NavIdentity } from "@/components/shared/nav-identity"

type NavItem = { label: string; href: string; icon: LucideIcon }

const productNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Practice", href: "/ai-practice", icon: Bot },
  { label: "Find Partners", href: "/explore", icon: Compass },
  { label: "Conversations", href: "/messages", icon: Inbox },
  // Four surfaces let people send friend requests, but until this appeared in
  // the navigation the only page that can accept one was unreachable, so
  // recipients could never respond.
  { label: "Friends", href: "/friends", icon: Users },
  // Same reasoning as Friends above: built without this, roadmap #31's review
  // deck would exist with no reachable entry point — a broken loop (13's
  // "audit features as complete round trips, not endpoints" lesson).
  { label: "Review", href: "/review", icon: RotateCcw },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
]

function NavLink({
  item,
  pathname,
  count = 0,
}: {
  item: NavItem
  pathname: string
  count?: number
}) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/")
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <span className="relative shrink-0">
        <Icon className="size-5" />
        {count > 0 && (
          // Also shown on the collapsed rail, where the label is hidden.
          <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold leading-none text-white lg:hidden">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
      <span className="hidden lg:inline">{item.label}</span>
      {count > 0 && (
        <span className="ml-auto hidden min-w-5 rounded-full bg-destructive px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white lg:inline-block">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}

function countFor(href: string, pendingFriendRequests: number, dueReviews: number): number {
  if (href === "/friends") return pendingFriendRequests
  if (href === "/review") return dueReviews
  return 0
}

export function Sidebar({
  identity,
  pendingFriendRequests = 0,
  dueReviews = 0,
}: {
  identity: NavIdentity
  pendingFriendRequests?: number
  dueReviews?: number
}) {
  const pathname = usePathname()
  const { name, username, image, role } = identity
  const initials = navInitials(name)

  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r bg-sidebar lg:flex lg:w-64">
      <div className="flex h-14 items-center border-b px-4">
        <BrandMark href="/dashboard" size="sm" hideWordmarkUntilLarge />
      </div>

      <nav className="flex-1 overflow-y-auto p-2 lg:p-3">
        {productNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            count={countFor(item.href, pendingFriendRequests, dueReviews)}
          />
        ))}
        {role === "admin" && (
          <NavLink
            item={{ label: "Admin", href: "/admin/dashboard", icon: Shield }}
            pathname={pathname}
          />
        )}
      </nav>

      <div className="border-t p-2 lg:p-3">
        <Link
          href={`/profile/${username}`}
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
        >
          <Avatar>
            {image ? <AvatarImage src={image} alt={name} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">@{username}</p>
          </div>
        </Link>
      </div>
    </aside>
  )
}
