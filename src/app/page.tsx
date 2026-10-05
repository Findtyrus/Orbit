import Link from "next/link";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { syncGoogle } from "@/lib/google";
import { getPlan } from "@/lib/billing";
import { Avatar, ContactRow } from "@/components/ContactRow";
import { StrengthBadge } from "@/components/StrengthBadge";
import { LoopCheck, MessageButton } from "@/components/client";
import { fullName, isOlderThan, isoDate, relDays, shortDate, type Commitment, type ContactStatus, type Synopsis } from "@/lib/types";
import { snooze } from "./contacts/actions";
import { Tour } from "@/components/Tour";
import { inZone, userTimeZone } from "@/lib/tz";
import { OutreachQueue, type QueueItem } from "@/components/OutreachQueue";

type Meeting = { id: string; title: string; start_at: string; end_at: string; contact_ids: string[]; attendees: { name: string | null; email: string }[]; debriefed: boolean };

const SYNC_EVERY_MS = 2 * 60 * 60 * 1000;

type TodayPick = { c: ContactStatus; s?: Synopsis; loops: Commitment[]; priority: number; reason: string };

const daysBetween = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

/** Rank everyone with a reason to talk today. Every point here is visible on the card as "why now". */
function rank(people: ContactStatus[], syn: Map<string, Synopsis>, loopsBy: Map<string, Commitment[]>, today: string): TodayPick[] {
  const soon = isoDate(3);
  const picks: TodayPick[] = [];
  for (const c of people) {
    if (c.snoozed_until && c.snoozed_until > today) continue;
    const s = syn.get(c.id);
    const loops = (loopsBy.get(c.id) ?? []).filter((l) => l.owner === "me");
    let priority = 0;
    const reasons: string[] = [];
    const dueLoops = loops.filter((l) => l.due_on && l.due_on <= soon);
    if (dueLoops.length) { priority += 50 + 10 * dueLoops.length; reasons.push(`You owe: ${dueLoops[0].text}`); }
    if (s?.follow_up_on && s.follow_up_on <= today) { priority += 35; reasons.push("Planned follow-up date reached"); }
    if (c.next_due && c.next_due <= today) {
      priority += 30 + Math.min(daysBetween(today, c.next_due), 30);
      reasons.push(`Check-in ${daysBetween(today, c.next_due) || 0}d overdue`);
    }
    if (c.awaiting_reply) { priority += 20; reasons.push(`No reply in ${daysBetween(today, c.last_interaction_at!)}d`); }
    if (!priority) continue;
    if (c.starred) priority += 10;
    priority += c.score * 0.3;
    picks.push({ c, s, loops, priority, reason: reasons[0] });
  }
  return picks.sort((a, b) => b.priority - a.priority);
}

function PersonCard({ p }: { p: TodayPick }) {
  const { c, s } = p;
  return (
    <article className="rounded-lg border border-line bg-card p-4">
      <Link href={`/contacts/${c.id}`} className="flex items-center gap-3">
        <Avatar c={c} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{fullName(c)}</span>
            <StrengthBadge strength={c.strength} score={c.score} />
          </div>
          <div className="truncate text-sm text-muted">{[c.title, c.company].filter(Boolean).join(" · ")}</div>
        </div>
      </Link>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">Last</dt><dd>{relDays(c.last_interaction_at)}</dd></div>
        <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">Why now</dt><dd>{s?.why_now && s.why_now !== "No rush" ? s.why_now : p.reason}</dd></div>
        {s?.next_step && <div className="flex gap-2"><dt className="w-20 shrink-0 text-muted">Next</dt><dd className="font-medium">{s.next_step}</dd></div>}
      </dl>
      {s?.suggested_message && (
        <details className="mt-3 rounded-md border border-line bg-card p-3 text-sm">
          <summary className="cursor-pointer text-muted">Suggested message</summary>
          <p className="mt-2 whitespace-pre-line">{s.suggested_message}</p>
        </details>
      )}
      {c.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.tags.slice(0, 3).map((t) => <span key={t} className="rounded border border-line bg-card px-2 py-0.5 text-xs text-muted">{t}</span>)}
        </div>
      )}
      <div className="mt-3 grid grid-cols-4 gap-2 text-sm font-medium">
        <MessageButton message={s?.suggested_message ?? null} linkedinUrl={c.linkedin_url} email={c.email}
          className="rounded-md bg-accent py-2 text-accent-ink" />
        <form action={snooze.bind(null, c.id, 7)}><button className="w-full rounded-md border border-line bg-card py-2">Snooze</button></form>
        <Link href={`/contacts/${c.id}#log`} className="rounded-md border border-line bg-card py-2 text-center">Note</Link>
        <Link href={`/contacts/${c.id}`} className="rounded-md border border-line bg-card py-2 text-center">View</Link>
      </div>
    </article>
  );
}

export default async function TodayPage() {
  const { supabase, user } = await getUser();
  const today = isoDate();
  const z = inZone(await userTimeZone());
  const now = new Date();
  const twoWeeksAgo = isoDate(-14);

  const [people, syn, loops, fresh, counts, me] = await Promise.all([
    supabase.from("contact_status").select("*")
      .or("interaction_count.gt.0,starred.eq.true,cadence_days.not.is.null").limit(2000),
    supabase.from("synopses").select("*").limit(5000),
    supabase.from("commitments").select("id, contact_id, text, owner, due_on, status")
      .eq("status", "open").order("due_on", { nullsFirst: false }).limit(500),
    supabase.from("contact_status").select("*")
      .gte("connected_on", twoWeeksAgo).eq("interaction_count", 0)
      .order("connected_on", { ascending: false }).limit(8),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    // select("*") so a not-yet-applied column (e.g. tour_done_at) can't break this query.
    supabase.from("profiles").select("*").maybeSingle(),
  ]);
  const [{ data: meetingRows }, { data: google }, { data: deadlineRows }, { data: queueRows }] = await Promise.all([
    supabase.from("meetings").select("id, title, start_at, end_at, contact_ids, attendees, debriefed")
      .gte("end_at", new Date(Date.parse(today) - 3 * 86_400_000).toISOString())
      .lte("start_at", new Date(Date.parse(today) + 3 * 86_400_000).toISOString())
      .order("start_at"),
    supabase.from("google_status").select("last_gmail_sync, needs_reconnect").maybeSingle(),
    supabase.from("firms").select("id, name, role, deadline, stage")
      .gte("deadline", today).lte("deadline", isoDate(14)).not("stage", "in", "(Applied,Interviewing,Offer,Closed)")
      .order("deadline"),
    supabase.from("outreach_queue").select("id, contact_id, kind, reason, channel, subject, body, status")
      .eq("for_date", today).neq("status", "skipped"),
  ]);
  const queueIds = (queueRows ?? []).map((q) => q.contact_id);
  const { data: queueContacts } = queueIds.length
    ? await supabase.from("contacts").select("id, first_name, last_name, title, company, email, linkedin_url").in("id", queueIds)
    : { data: [] };
  const qc = new Map((queueContacts ?? []).map((c) => [c.id, c]));
  const queue: QueueItem[] = (queueRows ?? []).filter((q) => q.status === "pending" && qc.has(q.contact_id)).map((q) => {
    const c = qc.get(q.contact_id)!;
    return {
      id: q.id, kind: q.kind, reason: q.reason, channel: q.channel, subject: q.subject, body: q.body,
      contact: { id: c.id, name: fullName(c), subtitle: [c.title, c.company].filter(Boolean).join(" · "), email: c.email, linkedin_url: c.linkedin_url },
    };
  });
  const sentToday = (queueRows ?? []).filter((q) => q.status === "sent").length;

  // Keep Gmail/Calendar fresh without a button: sync in the background after this page is sent.
  if (user && google && !google.needs_reconnect && process.env.SUPABASE_SECRET_KEY &&
      isOlderThan(google.last_gmail_sync, SYNC_EVERY_MS)) {
    after(() => syncGoogle(user.id));
  }

  if (!me.data?.onboarded_at) redirect("/onboarding");
  const plan = user ? await getPlan(supabase, user) : null;
  const list = (people.data ?? []) as ContactStatus[];
  const byId = new Map(list.map((c) => [c.id, c]));
  const synMap = new Map(((syn.data ?? []) as Synopsis[]).map((s) => [s.contact_id, s]));
  const openLoops = (loops.data ?? []) as Commitment[];
  const loopsBy = new Map<string, Commitment[]>();
  openLoops.forEach((l) => loopsBy.set(l.contact_id, [...(loopsBy.get(l.contact_id) ?? []), l]));

  const ranked = rank(list, synMap, loopsBy, today);
  const top = ranked.slice(0, 8);
  const shown = new Set(top.map((p) => p.c.id));
  const myLoops = openLoops.filter((l) => l.owner === "me");
  const waiting = list.filter((c) => c.awaiting_reply && !shown.has(c.id)).slice(0, 8);
  const freshList = (fresh.data ?? []) as ContactStatus[];
  const nowIso = new Date().toISOString();
  const meetingsAll = (meetingRows ?? []) as Meeting[];
  const upcoming = meetingsAll.filter((m) => m.end_at >= nowIso).slice(0, 5);
  const debriefs = meetingsAll.filter((m) => m.end_at < nowIso && !m.debriefed && m.contact_ids.length);
  const relationships = list.filter((c) => ["Warm", "Strong"].includes(c.strength)).length;

  const hour = z.hour(now);
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = me.data?.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      {!me.data?.tour_done_at && <Tour />}
      <header>
        <p className="text-sm text-muted">{z.date(now, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{greeting}{firstName ? `, ${firstName}` : ""}</h1>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [ranked.length, "to reach"],
            [myLoops.length, "open loops"],
            [relationships, `real of ${counts.count ?? 0}`],
          ].map(([n, label]) => (
            <div key={String(label)} className="rounded-lg border border-line bg-card py-3">
              <div className="text-xl font-semibold">{n}</div>
              <div className="text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>
      </header>

      {counts.count === 0 && (
        <section className="space-y-2 rounded-lg border border-line bg-card p-4">
          <h2 className="font-semibold">Get your network into Orbit</h2>
          <p className="text-sm text-muted">
            LinkedIn can take up to a day to send your data export. While you wait, add the people you&apos;re already
            talking to and add your target companies.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1 text-sm font-medium">
            <Link href="/contacts/new" className="rounded-md bg-accent py-2 text-center text-accent-ink">Add a person</Link>
            <Link href="/firms" className="rounded-md border border-line py-2 text-center">Add companies</Link>
          </div>
          <Link href="/me" className="block pt-1 text-sm underline decoration-line-strong underline-offset-2">Got your LinkedIn export? Import it</Link>
        </section>
      )}

      {plan?.source === "trial" && plan.trialDaysLeft <= 5 && (
        <Link href="/upgrade" className="block rounded-lg border border-accent/15 bg-accent-soft p-4 text-sm text-accent">
          Your Pro trial ends in {plan.trialDaysLeft} day{plan.trialDaysLeft === 1 ? "" : "s"}. Keep Pro for ${"$"}4/mo billed yearly →
        </Link>
      )}
      {plan?.tier === "free" && (
        <Link href="/upgrade" className="block rounded-lg border border-line bg-card p-4 text-sm">
          You&apos;re on Free. <span className="font-medium text-accent">Upgrade to Pro</span> for unlimited companies and AI features.
        </Link>
      )}

      {google?.needs_reconnect && (
        <Link href="/me" className="block rounded-lg border border-warn/25 bg-warn-soft p-4 text-sm text-warn">
          Google access expired. Tap to reconnect so meetings and emails keep syncing.
        </Link>
      )}

      {(deadlineRows ?? []).length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Applications due</h2>
          <div className="space-y-2">
            {(deadlineRows ?? []).map((f) => (
              <Link key={f.id} href={`/firms/${f.id}`} className="flex items-center justify-between rounded-lg border border-warn/25 bg-warn-soft p-4">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted">{f.role ?? "Application"} · {f.stage}</div>
                </div>
                <div className="text-sm font-semibold text-warn">{f.deadline === today ? "Today" : shortDate(f.deadline)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {(upcoming.length > 0 || debriefs.length > 0) && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Meetings</h2>
          <div className="space-y-2">
            {debriefs.map((m) => (
              <Link key={m.id} href={m.contact_ids[0] ? `/contacts/${m.contact_ids[0]}#log` : `/meetings/${m.id}`}
                className="block rounded-lg border border-accent/25 bg-accent-soft p-4">
                <div className="text-sm font-semibold text-accent">How did it go?</div>
                <div className="text-sm">{m.title} · {z.date(m.start_at, { weekday: "short", month: "short", day: "numeric" })}</div>
                <div className="mt-1 text-xs text-muted">Capture takeaways and follow-ups while they&apos;re fresh →</div>
              </Link>
            ))}
            {upcoming.map((m) => {
              const start = new Date(m.start_at);
              const isToday = z.day(m.start_at) === z.day(now);
              return (
                <Link key={m.id} href={`/meetings/${m.id}`} className="flex items-center gap-3 rounded-lg border border-line bg-card p-4">
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-xs text-muted">{isToday ? "Today" : z.date(start, { weekday: "short" })}</div>
                    <div className="text-sm font-semibold">{z.time(start)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.title}</div>
                    <div className="truncate text-sm text-muted">
                      {m.attendees.map((a) => a.name ?? a.email.split("@")[0]).join(", ")}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-accent">Prep →</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <OutreachQueue items={queue} sentToday={sentToday} canPrepare={!!process.env.ANTHROPIC_API_KEY} />

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Who to talk to today</h2>
        {top.length ? (
          <div className="space-y-3">{top.map((p) => <PersonCard key={p.c.id} p={p} />)}</div>
        ) : (
          <p className="rounded-lg border border-line bg-card p-4 text-sm text-muted">You&apos;re all caught up.</p>
        )}
        {ranked.length > top.length && (
          <p className="mt-2 text-center text-xs text-muted">+{ranked.length - top.length} more due. The top {top.length} matter most.</p>
        )}
      </section>

      {myLoops.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Open loops</h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-card px-4">
            {myLoops.slice(0, 10).map((l) => {
              const c = byId.get(l.contact_id);
              return <LoopCheck key={l.id} id={l.id} text={l.text} due={l.due_on} owner={l.owner} name={c ? fullName(c) : undefined} />;
            })}
          </ul>
        </section>
      )}

      {waiting.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Waiting on a reply</h2>
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
            {waiting.map((c) => <ContactRow key={c.id} c={c} hint={`sent ${relDays(c.last_interaction_at)}`} />)}
          </div>
        </section>
      )}

      {freshList.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">New connections</h2>
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
            {freshList.map((c) => <ContactRow key={c.id} c={c} hint={`joined ${c.connected_on?.slice(5)}`} />)}
          </div>
        </section>
      )}
    </div>
  );
}
