"use client";

import { useState, useTransition } from "react";
import { syncNow } from "../google-actions";
import type { SyncSummary } from "@/lib/google";

const STATUS: Record<string, string> = {
  connected: "Connected! Your first sync is running in the background and takes a minute or two.",
  denied: "Google access was cancelled.",
  "bad-state": "That sign-in link expired. Try connecting again.",
  "no-refresh-token": "Google didn't return offline access. Try connecting again.",
  "missing-scopes": "Please allow calendar access on Google's consent screen.",
  "token-failed": "Couldn't finish signing in with Google. Check the redirect URI in Google Cloud.",
  "save-failed": "Couldn't save the connection. Is SUPABASE_SECRET_KEY set and migration 0003 applied?",
  "missing-config": "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local and restart the app.",
};

type Status = { email: string; last_gmail_sync: string | null; needs_reconnect: boolean; last_error: string | null } | null;

export function GoogleSync({ status, flash, configured, gmail }: { status: Status; flash?: string; configured: boolean; gmail: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SyncSummary | null>(null);
  const when = status?.last_gmail_sync ? new Date(status.last_gmail_sync).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <section className="rounded-lg border border-line bg-card p-4">
      <h2 className="font-semibold">{gmail ? "Gmail & Calendar" : "Google Calendar"}</h2>
      <p className="mt-1 text-sm text-muted">
        Read-only. Meetings land on each person&apos;s timeline, with a prep brief before and a follow-up prompt after.
        {gmail && " Gmail (beta): real conversations sync too; newsletters and promotions are skipped."}
      </p>
      {flash && STATUS[flash] && (
        <p className={`mt-3 rounded-md p-3 text-sm ${flash === "connected" ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"}`}>{STATUS[flash]}</p>
      )}
      {!configured && !flash && (
        <p className="mt-3 rounded-md bg-warn-soft p-3 text-sm text-warn">Google isn&apos;t configured yet. See the setup steps in README.md.</p>
      )}

      {status ? (
        <div className="mt-3 space-y-3 text-sm">
          <div>
            Connected as <b>{status.email}</b>
            <div className="text-xs text-muted">{when ? `Last synced ${when}` : "First sync in progress…"}</div>
          </div>
          {status.needs_reconnect && (
            <p className="rounded-md bg-warn-soft p-3 text-warn">Google access expired (test-mode apps re-authorize weekly).</p>
          )}
          {!status.needs_reconnect && status.last_error && <p className="text-xs text-warn">Last error: {status.last_error}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={pending || status.needs_reconnect}
              onClick={() => start(async () => setResult(await syncNow()))}
              className="flex-1 rounded-md bg-accent py-2.5 font-medium text-accent-ink disabled:opacity-50">
              {pending ? "Syncing… (first run can take a few minutes)" : "Sync now"}
            </button>
            <a href="/api/google/connect" className={`rounded-md px-4 py-2.5 font-medium ${status.needs_reconnect ? "bg-accent text-accent-ink" : "bg-bg"}`}>
              Reconnect
            </a>
          </div>
          {result?.ok && (
            <p className="text-muted">
              ✓ {result.meetings} meetings{gmail ? ` · ${result.emails} emails from ${result.scanned} scanned` : ""} ·
              {" "}{result.learnedEmails} emails matched to people · {result.newContacts} new people
            </p>
          )}
          {result && !result.ok && <p className="text-warn">{result.error}</p>}
        </div>
      ) : (
        <a href="/api/google/connect"
          className={`mt-4 block rounded-md py-3 text-center font-medium text-accent-ink ${configured ? "bg-accent" : "pointer-events-none bg-muted"}`}>
          Connect Google Calendar
        </a>
      )}
    </section>
  );
}
