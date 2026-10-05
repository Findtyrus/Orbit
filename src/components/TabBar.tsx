"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Simple 1.5px line icons (Lucide-style geometry).
const TABS = [
  { href: "/", label: "Today", icon: "M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z" },
  { href: "/contacts", label: "People", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { href: "/firms", label: "Firms", icon: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5M9 11h.01M15 11h.01" },
  { href: "/me", label: "Account", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" },
];

const HIDDEN = ["/login", "/signup", "/welcome", "/onboarding", "/privacy", "/terms"];

export function TabBar() {
  const path = usePathname();
  if (HIDDEN.some((p) => path.startsWith(p))) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-xl">
        {TABS.map((t) => {
          // "Ask your network" lives under People.
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href) || (t.href === "/contacts" && path.startsWith("/ask"));
          return (
            <Link key={t.href} href={t.href}
              className={`relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[10.5px] font-medium tracking-wide ${active ? "text-accent" : "text-faint"}`}>
              {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-b bg-accent" />}
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
