import Link from "next/link";
import { cookies } from "next/headers";
import { getUser } from "@/lib/supabase/server";
import { fullName, isoAt, isoDate, type Commitment, type ContactStatus } from "@/lib/types";

type Item = {
  day: string;          // YYYY-MM-DD in the user's timezone
  time?: string;        // e.g. 2:30 PM, only for meetings
  kind: "Meeting" | "Follow-up" | "You promised" | "Check-in" | "Deadline";
  title: string;
  detail?: string;
  href: string;
};

const DAYS_AHEAD = 30;
const KIND_STYLE: Record<Item["kind"], string> = {
  "Meeting": "border-ink bg-ink text-bg",
  "Follow-up": "border-ink text-ink",
  "You promised": "border-ink text-ink",
  "Check-in": "border-line-strong text-muted",
  "Deadline": "border-warn/40 bg-warn-soft text-warn",
};

export default async function CalendarPage() {
  const tz = (await cookies()).get("tz")?.value || "America/Chicago";
  const dayOf = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
  const today = dayOf(isoAt());
  const end = isoDate(DAYS_AHEAD);
  const { supabase } = await getUser();

  const [meetings, synopses, loops, people, firms, google] = await Promise.all([
    supabase.from("meetings").select("id, title, start_at, attendees").gte("start_at", isoAt(-1))
      .lte("start_at", isoAt(DAYS_AHEAD)).order("start_at"),
    supabase.from("synopses").select("contact_id, follow_up_on, next_step").gte("follow_up_on", today).lte("follow_up_on", end),
    supabase.from("commitments").select("id, contact_id, text, owner, due_on, status").eq("status", "open").eq("owner", "me")
      .not("due_on", "is", null).lte("due_on", end).order("due_on"),
    supabase.from("contact_status").select("id, first_name, last_name, company, next_due, snoozed_until").limit(5000),
    supabase.from("firms").select("id, name, role, deadline").gte("deadline", today).lte("deadline", end),
    supabase.from("google_status").select("email").maybeSingle(),
  ]);
  const byId = new Map(((people.data ?? []) as ContactStatus[]).map((c) => [c.id, c]));
  const name = (id: string) => { const c = byId.get(id); return c ? fullName(c) : "Someone"; };

  const items: Item[] = [];
  for (const m of meetings.data ?? []) {
    const guests = (m.attendees ?? []) as { name: string | null; email: string }[];
    items.push({
      day: dayOf(m.start_at), kind: "Meeting", title: m.title, href: `/meetings/${m.id}`,
      time: new Date(m.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }),
      detail: guests.map((g) => g.name ?? g.email.split("@")[0]).join(", "),
    });
  }
  for (const s of synopses.data ?? []) {
    items.push({ day: s.follow_up_on, kind: "Follow-up", title: `Follow up with ${name(s.contact_id)}`, detail: s.next_step ?? undefined, href: `/contacts/${s.contact_id}` });
  }
  const overdueLoops = ((loops.data ?? []) as Commitment[]).filter((l) => l.due_on! < today);
  for (const l of (loops.data ?? []) as Commitment[]) {
    if (l.due_on! >= today) items.push({ day: l.due_on!, kind: "You promised", title: l.text, detail: name(l.contact_id), href: `/contacts/${l.contact_id}` });
  }
  for (const c of (people.data ?? []) as ContactStatus[]) {
    if (c.next_due && c.next_due > today && c.next_due <= end && !(c.snoozed_until && c.snoozed_until > c.next_due)) {
      items.push({ day: c.next_due, kind: "Check-in", title: `Check in with ${fullName(c)}`, detail: c.company ?? undefined, href: `/contacts/${c.id}` });
    }
  }
  for (const f of firms.data ?? []) {
    items.push({ day: f.deadline, kind: "Deadline", title: `${f.name} application due`, detail: f.role ?? undefined, href: `/firms/${f.id}` });
  }

  const order: Record<Item["kind"], number> = { "Meeting": 0, "Deadline": 1, "You promised": 2, "Follow-up": 3, "Check-in": 4 };
  items.sort((a, b) => a.day.localeCompare(b.day) || order[a.kind] - order[b.kind] || (a.time ?? "").localeCompare(b.time ?? ""));
  const days = [...new Set(items.map((i) => i.day))].filter((d) => d >= today);

  // Week strip: today plus the next 6 days, with a dot when something is scheduled.
  const week = Array.from({ length: 7 }, (_, i) => dayOf(isoAt(i)));
  const label = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  const heading = (d: string) => d === today ? "Today" : d === week[1] ? "Tomorrow" : label(d, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl tracking-tight">Calendar</h1>
        <p className="mt-1 text-muted">Chats, follow-ups, promises and deadlines for the next {DAYS_AHEAD} days.</p>
      </header>

      <div className="grid grid-cols-7 gap-1 rounded-lg border border-line bg-card p-2 text-center">
        {week.map((d) => {
          const count = items.filter((i) => i.day === d).length;
          return (
            <a key={d} href={`#d-${d}`} className={`rounded-md py-2 ${d === today ? "bg-ink text-bg" : ""}`}>
              <div className={`text-[10px] font-medium uppercase ${d === today ? "opacity-70" : "text-faint"}`}>{label(d, { weekday: "short" })}</div>
              <div className="text-base font-semibold tabular-nums">{label(d, { day: "numeric" })}</div>
              <div className={`mx-auto mt-0.5 h-1 w-1 rounded-full ${count ? (d === today ? "bg-bg" : "bg-ink") : "bg-transparent"}`} />
            </a>
          );
        })}
      </div>

      {overdueLoops.length > 0 && (
        <Link href="/" className="block rounded-lg border border-warn/30 bg-warn-soft p-4 text-sm text-warn">
          {overdueLoops.length} promise{overdueLoops.length === 1 ? " is" : "s are"} past due. See Today →
        </Link>
      )}
      {!google.data && (
        <Link href="/me" className="block rounded-lg border border-line bg-card p-4 text-sm">
          <span className="font-medium">Connect Google Calendar</span>
          <span className="text-muted"> to see your coffee chats here with a prep brief for each.</span>
        </Link>
      )}

      {days.map((d) => (
        <section key={d} id={`d-${d}`} className="scroll-mt-4">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{heading(d)}</h2>
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
            {items.filter((i) => i.day === d).map((i, n) => (
              <Link key={`${i.kind}-${i.href}-${n}`} href={i.href} className="block px-4 py-3 hover:bg-bg">
                <div className="flex items-center gap-2">
                  <span className={`rounded border px-1.5 py-px text-[11px] font-medium ${KIND_STYLE[i.kind]}`}>{i.kind}</span>
                  {i.time && <span className="text-xs font-medium tabular-nums text-muted">{i.time}</span>}
                </div>
                <div className="mt-1.5 font-medium leading-snug">{i.title}</div>
                {i.detail && <div className="mt-0.5 truncate text-sm text-muted">{i.detail}</div>}
              </Link>
            ))}
          </div>
        </section>
      ))}
      {!days.length && (
        <p className="rounded-lg border border-line bg-card p-4 text-sm text-muted">
          Nothing scheduled yet. Follow-up dates, promises with a due date, and check-ins will show up here.
        </p>
      )}
    </div>
  );
}
