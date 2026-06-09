"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import {
  Calendar,
  Compass,
  Inbox,
  Languages,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Settings,
  Shield,
  Users,
  Video,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type NavItem = { label: string; href: string; icon: LucideIcon }

const mainNav: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
]

const matchNav: NavItem[] = [
  { label: "Chat Match", href: "/match/chat", icon: MessageSquare },
  { label: "Video Match", href: "/match/video", icon: Video },
]

const socialNav: NavItem[] = [
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Messages", href: "/messages", icon: Inbox },
  { label: "Friends", href: "/friends", icon: Users },
  { label: "Schedule", href: "/schedule", icon: Calendar },
]

const bottomNav: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
]

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
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
      <Icon className="size-5 shrink-0" />
      <span className="hidden lg:inline">{item.label}</span>
    </Link>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="hidden px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground lg:block">
      {label}
    </p>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const name = session?.user?.name ?? "User"
  const username = (session?.user as { username?: string })?.username ?? "me"
  const plan = (session?.user as { plan?: string })?.plan ?? "free"
  const role = (session?.user as { role?: string })?.role
  const image = session?.user?.image ?? ""
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()

  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r bg-sidebar lg:flex lg:w-64">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Languages className="size-4" />
        </span>
        <span className="hidden text-base font-semibold lg:inline">LingoMatch</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 lg:p-3">
        {mainNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
        <SectionLabel label="Match" />
        {matchNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
        <SectionLabel label="Social" />
        {socialNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
        <SectionLabel label="Account" />
        {bottomNav.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
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
            <Badge variant={plan === "premium" ? "default" : "secondary"} className="mt-0.5 capitalize">
              {plan}
            </Badge>
          </div>
        </Link>
      </div>
    </aside>
  )
}
