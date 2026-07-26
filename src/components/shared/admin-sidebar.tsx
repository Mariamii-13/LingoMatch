"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Files,
  LayoutDashboard,
  type LucideIcon,
  Mic,
  Shield,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"

const adminNav: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Files", href: "/admin/files", icon: Files },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 text-zinc-100 lg:flex lg:w-64">
      <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-zinc-950">
          <Shield className="size-4" />
        </span>
        <span className="hidden font-semibold lg:inline">Admin Console</span>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto space-y-1 p-2 lg:p-3">
        {adminNav.map((item) => {
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
                  ? "bg-amber-500 text-zinc-950"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-zinc-800 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Mic className="size-4" />
          <span className="hidden lg:inline">Back to app</span>
        </Link>
      </div>
    </aside>
  )
}
