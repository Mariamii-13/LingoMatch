import Link from "next/link"
import { Mic } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-20 top-0 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-20 bottom-0 size-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
      </div>

      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Mic className="size-5" />
        </span>
        <span className="text-xl font-semibold">LingoMatch</span>
      </Link>

      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
