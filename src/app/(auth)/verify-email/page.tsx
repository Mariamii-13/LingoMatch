import Link from "next/link"
import { MailCheck } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function VerifyEmailPage() {
  return (
    <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="size-7" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold">Check your email</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a verification link to your inbox. Click it to activate your
        account and start speaking.
      </p>

      <div className="mt-6 space-y-3">
        <Button variant="outline" className="w-full">
          Resend verification email
        </Button>
        <Button className="w-full" nativeButton={false} render={<Link href="/profile" />}>
          I&apos;ve verified — continue
        </Button>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Wrong email?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Go back
        </Link>
      </p>
    </div>
  )
}
