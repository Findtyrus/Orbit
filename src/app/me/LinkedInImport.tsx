"use client";

import { useActionState } from "react";
import { importLinkedIn, type ImportResult } from "./import-actions";

export function LinkedInImport() {
  const [result, action, pending] = useActionState<ImportResult | null, FormData>(importLinkedIn, null);
  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <h2 className="font-semibold">LinkedIn</h2>
      <p className="mt-1 text-sm text-muted">
        On LinkedIn: Settings → Data privacy → Get a copy of your data. Upload the .zip here (or just
        Connections.csv and messages.csv). Re-upload anytime. Nothing duplicates and your notes are kept.
      </p>
      <form action={action} className="mt-4 space-y-3">
        <input name="files" type="file" multiple accept=".zip,.csv" required
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-4 file:py-2 file:font-medium file:text-accent" />
        <button disabled={pending} className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink disabled:opacity-60">
          {pending ? "Importing… (this can take a minute)" : "Import"}
        </button>
      </form>
      {result?.ok === false && <p className="mt-3 text-sm text-warn">{result.error}</p>}
      {result?.ok && (
        <ul className="mt-3 space-y-1 text-sm">
          <li>✓ {result.connections} connections</li>
          <li>✓ {result.newFromMessages} people from messages who weren&apos;t connections</li>
          <li>✓ {result.messages} LinkedIn messages added to timelines</li>
          <li>✓ {result.cadenceSet} people you&apos;ve talked with set to a 2-month check-in</li>
        </ul>
      )}
    </section>
  );
}
