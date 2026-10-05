"use client";

import { useActionState } from "react";
import { removeResume, uploadResume, type ResumeResult } from "../profile-actions";

type Saved = {
  summary: string;
  experience: { company: string; title: string }[];
  education: { school: string }[];
} | null;

export function ResumeUpload({ saved, updated }: { saved: Saved; updated: string | null }) {
  const [result, action, pending] = useActionState<ResumeResult | null, FormData>(uploadResume, null);
  return (
    <section className="space-y-3 rounded-lg border border-line bg-card p-4">
      <div>
        <h2 className="font-semibold">Resume</h2>
        <p className="mt-1 text-sm text-muted">
          Orbit reads your background to find what you have in common with people (same employer, school, path) and
          uses it in drafted messages. Only the details are kept, not the file.
        </p>
      </div>
      {saved && (
        <div className="rounded-md border border-line bg-bg p-3 text-sm">
          <p>{saved.summary}</p>
          {saved.experience.length > 0 && (
            <p className="mt-2 text-xs text-muted">{saved.experience.slice(0, 4).map((e) => `${e.title}, ${e.company}`).join(" · ")}</p>
          )}
          {updated && <p className="mt-2 text-[11px] text-faint">Updated {new Date(updated).toLocaleDateString()}</p>}
        </div>
      )}
      <form action={action} className="space-y-2">
        <input name="resume" type="file" accept="application/pdf,.pdf" required
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium" />
        <button disabled={pending} className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-accent-ink disabled:opacity-60">
          {pending ? "Reading your resume" : saved ? "Replace resume" : "Upload resume (PDF)"}
        </button>
      </form>
      {result?.ok === false && <p className="text-sm text-bad">{result.error}</p>}
      {result?.ok && <p className="text-sm text-good">Got it. New relationship memories will use your background.</p>}
      {saved && (
        <form action={removeResume}><button className="text-xs text-faint">Remove resume details</button></form>
      )}
    </section>
  );
}
