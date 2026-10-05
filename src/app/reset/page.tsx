"use client";

import { useActionState } from "react";
import { setNewPassword } from "../login/actions";
import { Logo } from "@/components/Logo";

export default function ResetPage() {
  const [error, action, pending] = useActionState(setNewPassword, null);
  return (
    <div className="flex min-h-[80vh] flex-col justify-center">
      <div className="mb-10"><Logo size={26} /></div>
      <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
      <form action={action} className="mt-8 space-y-3">
        <input name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="New password (8+ characters)"
          className="w-full rounded-md border border-line bg-card px-4 py-3 outline-none placeholder:text-faint focus:border-accent" />
        {error && <p className="text-sm text-bad">{error}</p>}
        <button disabled={pending} className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink disabled:opacity-60">
          {pending ? "Saving" : "Save password"}
        </button>
      </form>
    </div>
  );
}
