import { BrandMark } from "@/components/shared/brand-mark"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-0 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-20 bottom-0 size-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <BrandMark href="/" size="lg" className="mb-8" />

      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
