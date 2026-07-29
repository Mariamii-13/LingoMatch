"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Bot,
  Compass,
  Inbox,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const primaryItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Practice", href: "/ai-practice", icon: Bot },
  { label: "Find Partners", href: "/explore", icon: Compass },
  { label: "Conversations", href: "/messages", icon: Inbox },
]

const moreItems = [
  // Friends belongs here rather than the primary row: it needs to be reachable,
  // but it is a lower-frequency destination than practising or messaging. The
  // badge below surfaces pending requests without spending a primary slot.
  { label: "Friends", href: "/friends", icon: Users },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function MobileNav({ pendingFriendRequests = 0 }: { pendingFriendRequests?: number }) {
  const pathname = usePathname()
  const moreActive = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  )

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t bg-background/90 backdrop-blur-md lg:hidden">
      {primaryItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] leading-tight transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        )
      })}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More navigation"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-none px-1 py-2 text-[10px] leading-tight",
            moreActive ? "text-primary" : "text-muted-foreground"
          )}
        >
          <span className="relative">
            <Menu className="size-5" />
            {pendingFriendRequests > 0 && (
              // Without this, a pending request would be invisible on mobile
              // until the user happened to open the More menu.
              <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold leading-none text-white">
                {pendingFriendRequests > 9 ? "9+" : pendingFriendRequests}
              </span>
            )}
          </span>
          <span>More</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-48">
          <DropdownMenuLabel>More</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {moreItems.map((item) => {
            const Icon = item.icon
            const count = item.href === "/friends" ? pendingFriendRequests : 0
            return (
              <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
                <Icon className="size-4" /> {item.label}
                {count > 0 && (
                  <span className="ml-auto min-w-5 rounded-full bg-destructive px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
