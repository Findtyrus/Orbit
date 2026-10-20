"use client";

import { useState, useSyncExternalStore } from "react";
import { CopyLink } from "./CopyLink";

type Env = "server" | "installed" | "in-app" | "ios" | "android" | "other";
type InstallPrompt = Event & { prompt: () => Promise<void> };

const KEY = "orbit_install_guide_dismissed";
const IN_APP = /Instagram|FBAN|FBAV|TikTok|musical_ly|Bytedance|LinkedInApp|Snapchat|Twitter|Line\//i;

// Chrome on Android fires this once, early, so it is captured at load and handed to whichever card mounts.
let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    listeners.forEach((l) => l());
  });
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

function detect(): Env {
  const ua = navigator.userAgent;
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if (IN_APP.test(ua)) return "in-app";
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}
const useEnv = (): Env => useSyncExternalStore(() => () => {}, detect, () => "server");
const useDismissed = (): boolean => useSyncExternalStore(
  () => () => {},
  () => { try { return !!localStorage.getItem(KEY); } catch { return false; } },
  () => true,
);
const useCanPrompt = (): boolean => useSyncExternalStore(subscribe, () => !!deferred, () => false);

const ShareIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="inline h-4 w-4 align-[-3px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
);

/** One-tap install help: iPhone steps, or the real install button on Android. Hidden once installed or dismissed. */
export function InstallGuide() {
  const env = useEnv();
  const dismissedBefore = useDismissed();
  const canPrompt = useCanPrompt();
  const [closed, setClosed] = useState(false);
  if (closed || dismissedBefore || (env !== "ios" && env !== "android")) return null;
  const dismiss = () => { try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ } setClosed(true); };
  return (
    <section className="space-y-3 rounded-lg border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Put Orbit on your home screen</h2>
          <p className="text-sm text-muted">Opens like an app, one tap from your phone.</p>
        </div>
        <button type="button" onClick={dismiss} className="text-sm text-muted">Not now</button>
      </div>
      {env === "android" && canPrompt ? (
        <button type="button" className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink"
          onClick={async () => { await deferred?.prompt(); deferred = null; listeners.forEach((l) => l()); dismiss(); }}>
          Install Orbit
        </button>
      ) : env === "android" ? (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Tap the <b>⋮</b> menu in Chrome.</li>
          <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
        </ol>
      ) : (
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Tap the Share button <ShareIcon /> at the bottom of Safari.</li>
          <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
          <li>Tap <b>Add</b>. Orbit now opens like an app.</li>
        </ol>
      )}
    </section>
  );
}

/** Instagram, TikTok and LinkedIn open links in their own browser, which breaks installing and some sign-ins. */
export function InAppBrowserNotice() {
  const env = useEnv();
  if (env !== "in-app") return null;
  return (
    <section className="space-y-2 rounded-lg border border-line bg-card p-4 text-sm">
      <h2 className="font-semibold">Open this in your browser</h2>
      <p className="text-muted">
        You&apos;re inside another app&apos;s browser. For the smoothest sign-up, and to add Orbit to your home screen,
        tap the <b>⋯</b> or Share button and choose <b>Open in Safari</b> (or Chrome), or copy the link:
      </p>
      <CopyLink url="https://buildyourorbit.com/signup" />
    </section>
  );
}
