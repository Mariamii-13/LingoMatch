"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Mic,
  Settings,
  Users,
  Zap,
} from "lucide-react"

import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export const navItems: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Find Match", href: "/match", icon: Zap },
  { label: "Friends", href: "/friends", icon: Users },
  { label: "Schedule", href: "/schedule", icon: Calendar },
  { label: "Community", href: "/community", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const name = session?.user?.name ?? ""
  const username = (session?.user as any)?.username ?? ""
  const plan = (session?.user as any)?.plan ?? "free"
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"

  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r bg-sidebar lg:flex lg:w-64">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Mic className="size-4" />
        </span>
        <span className="hidden text-base font-semibold lg:inline">LingoMatch</span>
      </div>

      <nav className="flex-1 space-y-1 p-2 lg:p-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/")
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-2 lg:p-3">
        <Link
          href={`/profile/${username}`}
          className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
        >
          <Avatar>
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate text-sm font-medium">{name}</p>
            <Badge
              variant={plan === "premium" ? "default" : "secondary"}
              className="mt-0.5 capitalize"
            >
              {plan}
            </Badge>
          </div>
        </Link>
      </div>
    </aside>
  )
}
