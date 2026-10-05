"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "../login/actions";
import { Logo } from "@/components/Logo";

export default function ForgotPage() {
  const [message, action, pending] = useActionState(requestPasswordReset, null);
  return (
    <div className="flex min-h-[80vh] flex-col justify-center">
      <div className="mb-10"><Logo size={26} /></div>
      <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 mb-8 text-muted">We&apos;ll email you a link to choose a new one.</p>
      <form action={action} className="space-y-3">
        <input name="email" type="email" autoComplete="email" required placeholder="Email"
          className="w-full rounded-md border border-line bg-card px-4 py-3 outline-none placeholder:text-faint focus:border-accent" />
        <button disabled={pending} className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink disabled:opacity-60">
          {pending ? "Sending" : "Send reset link"}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
      <Link href="/login" className="mt-6 text-center text-sm text-muted">Back to sign in</Link>
    </div>
  );
}
