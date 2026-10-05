"use client";

import Link from "next/link";
import { useActionState } from "react";
import { addPerson } from "../actions";
import { CADENCES } from "@/lib/types";

const field = "w-full rounded-md border border-line bg-card px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent";

export default function AddPersonPage() {
  const [error, action, pending] = useActionState(addPerson, null);
  return (
    <div className="space-y-5">
      <header className="pt-2">
        <Link href="/contacts" className="text-sm text-muted">← People</Link>
        <h1 className="mt-2 text-3xl tracking-tight">Add a person</h1>
        <p className="mt-1 text-muted">Someone you met at a career fair, a coffee chat, or class.</p>
      </header>
      <form action={action} className="space-y-3 rounded-lg border border-line bg-card p-4">
        <input name="name" required placeholder="Full name" className={field} />
        <div className="grid grid-cols-2 gap-2">
          <input name="title" placeholder="Title" className={field} />
          <input name="company" placeholder="Company" className={field} />
        </div>
        <input name="email" type="email" placeholder="Email (optional)" className={field} />
        <input name="linkedin" placeholder="LinkedIn profile URL (optional)" className={field} />
        <textarea name="notes" rows={3} placeholder="How you met, what you talked about, anything to remember" className={field} />
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Keep in touch</span>
          <select name="cadence" defaultValue="60" className={field}>
            <option value="">No reminder</option>
            {CADENCES.map((c) => <option key={c.days} value={c.days}>{c.label}</option>)}
          </select>
        </label>
        {error && <p className="text-sm text-bad">{error}</p>}
        <button disabled={pending} className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink disabled:opacity-60">
          {pending ? "Adding" : "Add person"}
        </button>
      </form>
    </div>
  );
}
