import Link from "next/link"
import { ArrowLeft, KeyRound } from "lucide-react"

/*
 * This page used to show an email field and a "Send reset link" button that was
 * a link to /login — no handler, no endpoint, no email. The app has no mail
 * provider at all, so nothing was ever sent and the copy claiming otherwise was
 * false. Rather than keep a form that cannot work, say what is actually true and
 * point at the one recovery path that does exist.
 *
 * Replace this page with a real flow once an email provider is configured.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Password reset</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Resetting your own password by email is not available during the preview yet.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border bg-muted/30 p-4 text-sm leading-6">
        <p>
          <span className="font-medium text-foreground">If you signed up with Google,</span>{" "}
          you do not need a password — use{" "}
          <span className="font-medium text-foreground">Continue with Google</span> on the sign-in
          page.
        </p>
        <p className="text-muted-foreground">
          If you signed up with an email and password, ask the LingoMatch team to reset it for
          you. We would rather tell you that than show you a form that does nothing.
        </p>
      </div>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
    </div>
  )
}
