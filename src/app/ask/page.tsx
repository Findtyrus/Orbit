"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { askNetwork, type AskResult } from "../brain-actions";

const EXAMPLES = [
  "Who do I know that went from audit to transaction advisory?",
  "Who haven't I talked to in 3 months that could help with M&A recruiting?",
  "Who has experience with search funds or ETA?",
  "I have an A&M interview next week. Who should I talk to?",
];

export default function AskPage() {
  const [result, action, pending] = useActionState<AskResult | null, FormData>(askNetwork, null);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-5">
      <header>
        <Link href="/contacts" className="text-sm text-muted">← People</Link>
        <h1 className="text-3xl font-semibold tracking-tight">Ask your network</h1>
        <p className="mt-1 text-muted">Searches everyone, their roles, and what you&apos;ve talked about.</p>
      </header>

      <form ref={form} action={action} className="space-y-2">
        <textarea ref={input} name="q" rows={3} required placeholder="Who should I talk to before…"
          className="w-full resize-none rounded-lg border border-line bg-card px-4 py-3 outline-none placeholder:text-faint focus:border-accent"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.current?.requestSubmit(); } }} />
        <button disabled={pending} className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink disabled:opacity-60">
          {pending ? "Thinking through your network…" : "Ask"}
        </button>
      </form>

      {!result && !pending && (
        <div className="space-y-2">
          {EXAMPLES.map((q) => (
            <button key={q} type="button" className="block w-full rounded-lg border border-line bg-card px-4 py-3 text-left text-sm text-muted"
              onClick={() => { if (input.current) input.current.value = q; form.current?.requestSubmit(); }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {result?.ok === false && <p className="text-sm text-warn">{result.error}</p>}
      {result?.ok && (
        <section className="space-y-3">
          <p className="rounded-lg border border-accent/15 bg-accent-soft p-4 text-sm">{result.answer}</p>
          {result.people.map((p) => (
            <Link key={p.id} href={`/contacts/${p.id}`} className="block rounded-lg border border-line bg-card p-4">
              <div className="font-semibold">{p.name}</div>
              {p.subtitle && <div className="text-sm text-muted">{p.subtitle}</div>}
              <p className="mt-2 text-sm">{p.why}</p>
              <p className="mt-1 text-sm font-medium text-accent">→ {p.action}</p>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
