import { BrandMark } from "@/components/shared/brand-mark"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center px-4 py-4 sm:px-6">
          <BrandMark href="/" size="sm" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
