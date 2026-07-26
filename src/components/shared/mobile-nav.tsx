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
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
]

export function MobileNav() {
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
          <Menu className="size-5" />
          <span>More</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-48">
          <DropdownMenuLabel>More</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {moreItems.map((item) => {
            const Icon = item.icon
            return (
              <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
                <Icon className="size-4" /> {item.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
