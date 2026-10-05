"use client";

import { useState } from "react";

type Pref = "system" | "light" | "dark";

/** Appearance setting. Saved in a cookie so the server renders the right theme on first paint. */
function applyTheme(p: Pref) {
  document.cookie = `theme=${p}; path=/; max-age=31536000; samesite=lax`;
  if (p === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = p;
}

export function ThemePicker({ initial }: { initial: Pref }) {
  const [pref, setPref] = useState<Pref>(initial);
  function choose(p: Pref) {
    setPref(p);
    applyTheme(p);
  }
  return (
    <div className="flex gap-1 rounded-lg border border-line bg-bg p-1">
      {(["system", "light", "dark"] as const).map((p) => (
        <button key={p} type="button" onClick={() => choose(p)}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize ${pref === p ? "bg-card text-ink shadow-sm" : "text-muted"}`}>
          {p}
        </button>
      ))}
    </div>
  );
}
