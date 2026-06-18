import { Navbar } from "@/components/shared/navbar"
import { Sidebar } from "@/components/shared/sidebar"
import { MobileNav } from "@/components/shared/mobile-nav"
import { AppThemeProvider } from "@/components/shared/app-theme-provider"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-scope flex min-h-screen">
      <AppThemeProvider />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
