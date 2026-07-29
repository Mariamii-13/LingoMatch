import { auth } from "@/auth"
import { Navbar } from "@/components/shared/navbar"
import { Sidebar } from "@/components/shared/sidebar"
import { MobileNav } from "@/components/shared/mobile-nav"
import { AppThemeProvider } from "@/components/shared/app-theme-provider"
import { countIncomingFriendRequests } from "@/lib/friend-requests.server"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  // Counted here so the navigation can advertise pending requests without the
  // client polling for them.
  const pendingFriendRequests = session?.user?.id
    ? await countIncomingFriendRequests(session.user.id)
    : 0

  return (
    <div className="app-scope flex min-h-screen">
      <AppThemeProvider />
      <Sidebar pendingFriendRequests={pendingFriendRequests} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav pendingFriendRequests={pendingFriendRequests} />
    </div>
  )
}
