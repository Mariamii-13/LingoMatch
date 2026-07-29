"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  BarChart3,
  Bot,
  Compass,
  Inbox,
  Languages,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Shield,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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

export function Sidebar({ pendingFriendRequests = 0 }: { pendingFriendRequests?: number }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const name = session?.user?.name ?? "User"
  const username = (session?.user as { username?: string })?.username ?? "me"
  const role = (session?.user as { role?: string })?.role
  const image = session?.user?.image ?? ""
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r bg-sidebar lg:flex lg:w-64">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Languages className="size-4" />
          </span>
          <span className="hidden text-base font-semibold lg:inline">LingoMatch</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 lg:p-3">
        {productNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            count={item.href === "/friends" ? pendingFriendRequests : 0}
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
