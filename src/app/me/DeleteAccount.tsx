"use client";

import { useActionState } from "react";
import { deleteAccount } from "../account-actions";

export function DeleteAccount() {
  const [error, action, pending] = useActionState(deleteAccount, null);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-warn">Delete account</summary>
      <form action={action} className="mt-2 space-y-2">
        <p className="text-muted">Permanently deletes your account and everything in it. This can&apos;t be undone.</p>
        <input name="confirm" placeholder="Type DELETE" autoComplete="off"
          className="w-full rounded-md border border-line bg-card px-3 py-2 outline-none focus:border-warn" />
        {error && <p className="text-warn">{error}</p>}
        <button disabled={pending} className="w-full rounded-md bg-bad py-2 font-medium text-accent-ink disabled:opacity-60">
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </form>
    </details>
  );
}
