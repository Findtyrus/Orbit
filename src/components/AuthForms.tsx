"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { resendConfirmation, signIn, signInWithGoogle, signUp, verifySignupCode, type SignUpState } from "@/app/login/actions";

const input = "w-full rounded-md border border-line bg-card px-4 py-3 outline-none placeholder:text-faint focus:border-accent";

export function GoogleButton() {
  if (process.env.NEXT_PUBLIC_GOOGLE_SIGNIN !== "true") return null;
  return (
    <form action={signInWithGoogle}>
      <button className="flex w-full items-center justify-center gap-2 rounded-md border border-line bg-card py-3 font-medium">
        <svg viewBox="0 0 48 48" className="h-5 w-5"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        Continue with Google
      </button>
    </form>
  );
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [error, action, pending] = useActionState(signIn, initialError ?? null);
  return (
    <div className="space-y-3">
      <GoogleButton />
      <form action={action} className="space-y-3">
        <input name="email" type="email" autoComplete="email" required placeholder="Email" className={input} />
        <input name="password" type="password" autoComplete="current-password" required placeholder="Password" className={input} />
        {error && <p className="text-sm text-warn">{error}</p>}
        <button disabled={pending} className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink disabled:opacity-60">
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="flex justify-between text-sm text-muted">
        <Link href="/forgot">Forgot password?</Link>
        <Link href="/signup" className="font-medium text-ink">Create an account</Link>
      </div>
    </div>
  );
}

function CheckEmail({ email }: { email: string }) {
  const [error, verify, verifying] = useActionState(verifySignupCode.bind(null, email), null);
  const [note, setNote] = useState<string | null>(null);
  const [resending, start] = useTransition();
  return (
    <div className="space-y-4 rounded-lg border border-line bg-card p-5">
      <div>
        <div className="font-semibold">Check your email</div>
        <p className="mt-1 text-sm text-muted">
          We sent a confirmation email to <b className="text-ink">{email}</b>. Tap the link in it, or enter the
          6-digit code below. If you don&apos;t see it within a minute, check spam or junk.
        </p>
      </div>
      <form action={verify} className="flex gap-2">
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="6-digit code"
          className="min-w-0 flex-1 rounded-md border border-line bg-card px-3 py-2.5 text-center text-lg tracking-[0.3em] outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-faint focus:border-ink" />
        <button disabled={verifying} className="rounded-md bg-accent px-4 text-sm font-medium text-accent-ink disabled:opacity-60">
          {verifying ? "Checking" : "Verify"}
        </button>
      </form>
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex items-center justify-between text-sm">
        <button type="button" disabled={resending} onClick={() => start(async () => setNote(await resendConfirmation(email)))}
          className="font-medium underline decoration-line-strong underline-offset-2 disabled:opacity-60">
          {resending ? "Sending" : "Resend email"}
        </button>
        <Link href="/login" className="text-muted">Already confirmed? Sign in</Link>
      </div>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<SignUpState, FormData>(signUp, null);
  if (state?.sent) return <CheckEmail email={state.sent} />;
  return (
    <div className="space-y-3">
      <GoogleButton />
      <form action={action} className="space-y-3">
        <input name="name" autoComplete="name" required placeholder="Full name" className={input} />
        <input name="email" type="email" autoComplete="email" required placeholder="School or personal email" className={input} />
        <input name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="Password (8+ characters)" className={input} />
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" name="agree" required className="mt-1" />
          <span>I agree to the <Link href="/terms" className="text-accent">Terms</Link> and <Link href="/privacy" className="text-accent">Privacy Policy</Link>.</span>
        </label>
        {state?.error && <p className="text-sm text-warn">{state.error}</p>}
        <button disabled={pending} className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink disabled:opacity-60">
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-center text-sm text-muted">Already have an account? <Link href="/login" className="font-medium text-accent">Sign in</Link></p>
    </div>
  );
}
