import Link from "next/link";
import { fullName, relDays, type ContactStatus } from "@/lib/types";

export function Avatar({ c, size = 44 }: { c: Pick<ContactStatus, "first_name" | "last_name">; size?: number }) {
  const initials = `${c.first_name[0] ?? ""}${c.last_name[0] ?? ""}`.toUpperCase() || "?";
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full border border-line bg-accent-soft font-semibold text-accent"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

export function ContactRow({ c, hint }: { c: ContactStatus; hint?: string }) {
  const subtitle = [c.title, c.company].filter(Boolean).join(" · ");
  return (
    <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-bg active:bg-bg">
      <Avatar c={c} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{fullName(c)}</span>
          {c.starred && <span className="text-xs text-ink">★</span>}
        </div>
        {subtitle && <div className="truncate text-sm text-muted">{subtitle}</div>}
      </div>
      <div className="shrink-0 text-right text-xs text-faint">{hint ?? relDays(c.last_interaction_at)}</div>
    </Link>
  );
}
