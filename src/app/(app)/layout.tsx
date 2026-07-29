import { auth } from "@/auth"
import { Navbar } from "@/components/shared/navbar"
import { Sidebar } from "@/components/shared/sidebar"
import { MobileNav } from "@/components/shared/mobile-nav"
import { AppThemeProvider } from "@/components/shared/app-theme-provider"
import { countIncomingFriendRequests } from "@/lib/friend-requests.server"
import type { NavIdentity } from "@/components/shared/nav-identity"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  // Counted here so the navigation can advertise pending requests without the
  // client polling for them.
  const pendingFriendRequests = session?.user?.id
    ? await countIncomingFriendRequests(session.user.id)
    : 0

  // Resolved here rather than from useSession in each component, so the
  // navigation never renders a placeholder identity before correcting itself.
  const identity: NavIdentity = {
    name: session?.user?.name ?? "User",
    username: (session?.user as { username?: string })?.username ?? "me",
    image: session?.user?.image ?? "",
    role: (session?.user as { role?: string })?.role,
  }

  return (
    <div className="app-scope flex min-h-screen">
      <AppThemeProvider />
      <Sidebar identity={identity} pendingFriendRequests={pendingFriendRequests} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar identity={identity} />
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav pendingFriendRequests={pendingFriendRequests} />
    </div>
  )
}
