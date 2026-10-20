"use client";

import { useActionState, useState, useTransition } from "react";
import { applyCatchUp, proposeCatchUp, type CatchUpItem, type CatchUpResult } from "@/app/catchup-actions";

const LABEL = { close_loop: "Close loop", log_note: "Add note", new_loop: "New loop" } as const;

/** Type what you've done; Orbit proposes which loops to close and what to log, and you approve. */
export function CatchUp() {
  const [result, action, pending] = useActionState<CatchUpResult | null, FormData>(proposeCatchUp, null);
  const [applying, startApply] = useTransition();
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items: CatchUpItem[] = result?.ok ? result.items : [];
  const chosen = items.filter((i) => !skipped.has(i.key));
  const toggle = (key: string) => setSkipped((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  return (
    <details className="rounded-lg border border-line bg-card p-4">
      <summary className="cursor-pointer font-semibold">Catch up Orbit</summary>
      <p className="mt-1 text-sm text-muted">
        Tell Orbit what you&apos;ve done since you last updated. It closes finished loops and logs the news, and you approve each change.
      </p>
      <form action={(fd) => { setSkipped(new Set()); setDone(null); setError(null); action(fd); }} className="mt-3 space-y-2">
        <textarea name="text" required rows={4} maxLength={4000}
          placeholder="Example: I sent Sarah my resume, had coffee with Mike last Tuesday and he offered to intro me to his MD, and I accepted my January internship."
          className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent" />
        <button disabled={pending} className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-accent-ink disabled:opacity-60">
          {pending ? "Reading your update…" : "Find what to update"}
        </button>
      </form>
      {result?.ok === false && <p className="mt-3 text-sm text-warn">{result.error}</p>}
      {done && <p className="mt-3 rounded-md border border-accent/15 bg-accent-soft p-3 text-sm text-accent">{done}</p>}
      {result?.ok && !done && (
        <div className="mt-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted">I couldn&apos;t match that to anyone in your network. Try using full names.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.key}>
                  <label className="flex items-start gap-3 rounded-md border border-line p-3 text-sm">
                    <input type="checkbox" checked={!skipped.has(it.key)} onChange={() => toggle(it.key)} className="mt-1" />
                    <span>
                      <span className="text-xs font-medium uppercase tracking-wide text-muted">{LABEL[it.action]}{it.person ? ` · ${it.person}` : ""}</span>
                      <span className="block">{it.summary}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {result.unmatched.length > 0 && (
            <p className="text-xs text-muted">Couldn&apos;t place: {result.unmatched.join("; ")}</p>
          )}
          {items.length > 0 && (
            <button disabled={applying || chosen.length === 0}
              onClick={() => startApply(async () => {
                const err = await applyCatchUp(chosen);
                if (err) setError(err); else setDone(`Updated ${chosen.length} thing${chosen.length === 1 ? "" : "s"}. Memories refresh in the background.`);
              })}
              className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-accent-ink disabled:opacity-60">
              {applying ? "Applying…" : `Apply ${chosen.length} change${chosen.length === 1 ? "" : "s"}`}
            </button>
          )}
          {error && <p className="text-sm text-warn">{error}</p>}
        </div>
      )}
    </details>
  );
}
