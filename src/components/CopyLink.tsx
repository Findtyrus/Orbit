"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-md border border-line bg-card px-3 py-2 text-sm" />
      <button type="button" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink"
        onClick={async () => {
          try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* user can copy from the field */ }
        }}>
        {done ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
