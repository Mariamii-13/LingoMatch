"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Inbox, LayoutDashboard, MessageSquare, Users, Video } from "lucide-react"

import { cn } from "@/lib/utils"

const items = [
  { label: "Home",     href: "/dashboard",  icon: LayoutDashboard },
  { label: "Chat",     href: "/match/chat", icon: MessageSquare },
  { label: "Video",    href: "/match/video", icon: Video },
  { label: "Messages", href: "/messages",   icon: Inbox },
  { label: "Friends",  href: "/friends",    icon: Users },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t bg-background/90 backdrop-blur-md lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/")
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
