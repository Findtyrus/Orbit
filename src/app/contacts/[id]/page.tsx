import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { Avatar } from "@/components/ContactRow";
import { StrengthBadge } from "@/components/StrengthBadge";
import { CopyText, LoopCheck, MessageButton, RefreshBrainButton } from "@/components/client";
import { gmailComposeHref, mailtoHref } from "@/lib/email-draft";
import {
  CADENCES, fullName, relDays,
  type Commitment, type ContactStatus, type Facts, type Interaction, type Synopsis,
} from "@/lib/types";
import { logInteraction, saveNotes, setCadence, snooze, toggleStar } from "../actions";
import { addLoop } from "../../brain-actions";
import { setPersonStageForm } from "../../firm-actions";
import { PERSON_STAGES, worksAt, type Firm } from "@/lib/firms";
import Link from "next/link";

const KIND_LABEL: Record<Interaction["kind"], string> = {
  linkedin_message: "LinkedIn",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  call: "Call",
};

const FACT_LABELS: [keyof Facts, string][] = [
  ["career", "Career"],
  ["they_told_you", "Things they told you"],
  ["you_told_them", "Things you told them"],
  ["advice_given", "Advice they gave"],
  ["personal", "Personal"],
];

export default async function ContactPage({ params }: PageProps<"/contacts/[id]">) {
  const { id } = await params;
  const { supabase } = await getUser();
  const [{ data: c }, { data: timeline }, { data: synopsis }, { data: loopRows }, { data: firmRows }] = await Promise.all([
    supabase.from("contact_status").select("*").eq("id", id).maybeSingle<ContactStatus>(),
    supabase.from("interactions").select("id, kind, direction, occurred_at, subject, body")
      .eq("contact_id", id).order("occurred_at", { ascending: false }).limit(150),
    supabase.from("synopses").select("*").eq("contact_id", id).maybeSingle<Synopsis>(),
    supabase.from("commitments").select("id, contact_id, text, owner, due_on, status")
      .eq("contact_id", id).eq("status", "open").order("due_on", { nullsFirst: false }),
    supabase.from("firms").select("id, name, aliases, stage"),
  ]);
  if (!c) notFound();
  const items = (timeline ?? []) as Interaction[];
  const loops = (loopRows ?? []) as Commitment[];
  const firm = ((firmRows ?? []) as Pick<Firm, "id" | "name" | "aliases" | "stage">[]).find((f) => worksAt(c.company, f));

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-center pt-4 text-center">
        <Avatar c={c} size={84} />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{fullName(c)}</h1>
        {(c.title || c.company) && <p className="text-muted">{[c.title, c.company].filter(Boolean).join(" · ")}</p>}
        <div className="mt-2"><StrengthBadge strength={c.strength} score={c.score} /></div>
        {c.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {c.tags.map((t) => <span key={t} className="rounded border border-line bg-card px-2 py-0.5 text-xs text-muted">{t}</span>)}
          </div>
        )}
        {firm && (
          <Link href={`/firms/${firm.id}`} className="mt-2 rounded border border-accent/20 bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
            Target firm · {firm.name} ({firm.stage}) →
          </Link>
        )}
        <p className="mt-2 text-xs text-muted">
          Last contact {relDays(c.last_interaction_at)}
          {c.connected_on && ` · connected ${c.connected_on}`}
        </p>
        <div className="mt-4 flex gap-2">
          {c.linkedin_url && (
            <a href={c.linkedin_url} target="_blank" className="rounded-md border border-line bg-card px-4 py-2 text-sm font-medium">LinkedIn</a>
          )}
          {c.email && <a href={`mailto:${c.email}`} className="rounded-md border border-line bg-card px-4 py-2 text-sm font-medium">Email</a>}
          <form action={toggleStar.bind(null, c.id, c.starred)}>
            <button className={`rounded-md border px-4 py-2 text-sm font-medium ${c.starred ? "border-ink bg-ink text-bg" : "border-line bg-card"}`}>
              {c.starred ? "★ Starred" : "☆ Star"}
            </button>
          </form>
        </div>
      </header>

      <form action={setPersonStageForm.bind(null, c.id)} className="no-scrollbar flex gap-2 overflow-x-auto">
        {PERSON_STAGES.map((s) => (
          <button key={s} name="stage" value={s}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm ${c.stage === s ? "border-ink bg-ink text-bg" : "border-line bg-card text-muted"}`}>
            {s}
          </button>
        ))}
      </form>

      <section className="rounded-lg border border-accent/15 bg-accent-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-accent">Relationship memory</h2>
          <RefreshBrainButton contactId={c.id} label={synopsis ? "Refresh" : "Build memory"} />
        </div>
        {synopsis ? (
          <div className="mt-2 space-y-4 text-sm">
            <p>{synopsis.summary}</p>
            {synopsis.next_step && (
              <div className="rounded-md border border-line bg-card p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Recommended next step</div>
                <p className="mt-1 font-medium">{synopsis.next_step}</p>
                {synopsis.why_now && <p className="mt-1 text-muted">{synopsis.why_now}</p>}
                {synopsis.follow_up_on && <p className="mt-1 text-xs text-muted">Follow up around {synopsis.follow_up_on}</p>}
              </div>
            )}
            {FACT_LABELS.map(([key, label]) => {
              const xs = synopsis.facts?.[key] ?? [];
              return xs.length ? (
                <div key={key}>
                  <div className="font-medium">{label}</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">{xs.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              ) : null;
            })}
            {synopsis.talking_points.length > 0 && (
              <div>
                <div className="font-medium">Bring up next time</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">{synopsis.talking_points.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            )}
            <p className="text-xs text-muted">Updated {relDays(synopsis.generated_at)} from {synopsis.source_count} interactions</p>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">
            {items.length
              ? `${items.length} interactions on file. Build a memory to get a synopsis, open loops and a drafted message.`
              : "No conversations yet. Building a memory drafts a first message from their background."}
          </p>
        )}
      </section>

      {synopsis?.suggested_message && (
        <section className="rounded-lg border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Suggested message</h2>
            <CopyText text={synopsis.suggested_message} />
          </div>
          <p className="mt-2 whitespace-pre-line text-sm">{synopsis.suggested_message}</p>
          <div className="mt-3 flex gap-2">
            {c.linkedin_url && (
              <MessageButton message={synopsis.suggested_message} linkedinUrl={c.linkedin_url} email={null}
                className="flex-1 rounded-md bg-accent py-2 text-sm font-medium text-accent-ink" />
            )}
            {c.email && (
              <>
                <a href={mailtoHref(c.email, null, synopsis.suggested_message)}
                  className={`flex-1 rounded-md py-2 text-center text-sm font-medium ${c.linkedin_url ? "border border-line" : "bg-accent text-accent-ink"}`}>Email draft</a>
                <a href={gmailComposeHref(c.email, null, synopsis.suggested_message)} target="_blank" rel="noopener noreferrer"
                  className="rounded-md border border-line px-3 py-2 text-sm font-medium">Gmail</a>
              </>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            Opens a draft in LinkedIn or your email. You review it and send it yourself.
          </p>
        </section>
      )}

      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="text-sm font-semibold">Open loops</h2>
        {loops.length > 0 ? (
          <ul className="mt-1 divide-y divide-line">
            {loops.map((l) => <LoopCheck key={l.id} id={l.id} text={l.text} due={l.due_on} owner={l.owner} />)}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-muted">Nothing outstanding.</p>
        )}
        <form action={addLoop.bind(null, c.id)} className="mt-3 flex gap-2">
          <input name="text" placeholder="Send resume, intro to…"
            className="min-w-0 flex-1 rounded-md border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent" />
          <input name="due_on" type="date" className="w-32 rounded-md border border-line bg-card px-2 py-2 text-sm" />
          <button className="rounded-md border border-line bg-card px-3 text-sm font-medium">Add</button>
        </form>
      </section>

      <section id="log" className="scroll-mt-4 rounded-lg border border-line bg-card p-4">
        <h2 className="text-sm font-semibold">How did it go?</h2>
        <p className="mt-0.5 text-xs text-muted">
          Type or dictate what you discussed. Orbit folds it into their memory, open loops and next step.
        </p>
        <form action={logInteraction.bind(null, c.id)} className="mt-2 space-y-2">
          <textarea name="body" rows={3}
            placeholder="He targets HVAC services at $2 to 8M EBITDA and said to reach back out after my internship…"
            className="w-full resize-none rounded-md border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent" />
          <div className="flex gap-2">
            <button name="kind" value="out" className="flex-1 rounded-md bg-accent py-2 text-sm font-medium text-accent-ink">I reached out</button>
            <button name="kind" value="call" className="flex-1 rounded-md border border-line bg-card py-2 text-sm font-medium">Log call</button>
            <button name="kind" value="note" className="flex-1 rounded-md border border-line bg-card py-2 text-sm font-medium">Save note</button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="text-sm font-semibold">Keep in touch</h2>
        <form action={setCadence.bind(null, c.id)} className="mt-3 flex flex-wrap gap-2">
          {[{ days: 0, label: "Off" }, ...CADENCES].map((o) => {
            const active = (c.cadence_days ?? 0) === o.days;
            return (
              <button key={o.days} name="cadence" value={o.days || ""}
                className={`rounded-md border px-3 py-1.5 text-sm ${active ? "border-ink bg-ink text-bg" : "border-line bg-card text-muted"}`}>
                {o.label}
              </button>
            );
          })}
        </form>
        {c.next_due && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted">Next check-in: <b className="text-ink">{c.next_due}</b></span>
            <form action={snooze.bind(null, c.id, 7)}><button className="text-accent">Snooze 1w</button></form>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="text-sm font-semibold">About {c.first_name}</h2>
        <form action={saveNotes.bind(null, c.id)} className="mt-2 space-y-2">
          <textarea name="notes" rows={3} defaultValue={c.notes ?? ""} placeholder="How you met, family, interests, goals…"
            className="w-full resize-none rounded-md border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent" />
          <button className="text-sm font-medium text-accent">Save</button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Timeline</h2>
        <ol className="space-y-2">
          {synopsis?.follow_up_on && synopsis.follow_up_on > new Date().toISOString().slice(0, 10) && (
            <li className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">
              <div className="flex justify-between text-xs"><span>Upcoming</span><span>{synopsis.follow_up_on}</span></div>
              <div className="mt-1">Suggested follow-up</div>
            </li>
          )}
          {items.map((i) => (
            <li key={i.id} className="rounded-lg border border-line bg-card p-3">
              <div className="flex justify-between text-xs text-muted">
                <span>
                  {KIND_LABEL[i.kind]}
                  {i.direction === "out" ? " · you" : i.direction === "in" ? ` · ${c.first_name}` : ""}
                </span>
                <span>{new Date(i.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              {i.subject && <div className="mt-1 text-sm font-medium">{i.subject}</div>}
              {i.body && <p className="mt-1 line-clamp-6 whitespace-pre-line text-sm">{i.body}</p>}
            </li>
          ))}
          {c.connected_on && (
            <li className="rounded-lg border border-line bg-card p-3 text-sm">
              <div className="flex justify-between text-xs text-muted"><span>LinkedIn</span><span>{c.connected_on}</span></div>
              <div className="mt-1">Connected on LinkedIn</div>
            </li>
          )}
        </ol>
      </section>
    </div>
  );
}

