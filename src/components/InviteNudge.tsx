"use client";

import { useState, useSyncExternalStore } from "react";
import { CopyLink } from "./CopyLink";

const KEY = "orbit_invite_nudge_dismissed";

/** A quiet, dismissible invite card on Today for students who are using Orbit and haven't invited anyone. */
export function InviteNudge({ url }: { url: string }) {
  const [closed, setClosed] = useState(false);
  // Server and first paint show the card; the saved dismissal applies once the browser is ready.
  const saved = useSyncExternalStore(
    () => () => {},
    () => { try { return !!localStorage.getItem(KEY); } catch { return false; } },
    () => false,
  );
  const hidden = closed || saved;
  if (hidden) return null;
  return (
    <section className="mb-4 space-y-3 rounded-lg border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Know someone recruiting too?</h2>
          <p className="text-sm text-muted">Invite a friend. They get 7 extra trial days and you get a free month once they import LinkedIn.</p>
        </div>
        <button type="button" aria-label="Dismiss" className="text-sm text-muted"
          onClick={() => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } setClosed(true); }}>
          Not now
        </button>
      </div>
      <CopyLink url={url} />
    </section>
  );
}
