"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { prepareOutreach, resolveOutreach } from "@/app/outreach-actions";
import { gmailComposeHref, mailtoHref } from "@/lib/email-draft";

export type QueueItem = {
  id: string;
  kind: "intro" | "follow_up" | "check_in";
  reason: string;
  channel: "linkedin" | "email";
  subject: string | null;
  body: string;
  contact: { id: string; name: string; subtitle: string; email: string | null; linkedin_url: string | null };
};

const KIND_LABEL = { intro: "Intro", follow_up: "Follow-up", check_in: "Check-in" };

function Card({ item }: { item: QueueItem }) {
  const [body, setBody] = useState(item.body);
  const [opened, setOpened] = useState(false);
  const [gone, setGone] = useState(false);
  const [pending, start] = useTransition();
  if (gone) return null;

  const finish = (status: "sent" | "skipped") => start(async () => {
    await resolveOutreach(item.id, status, body !== item.body ? body : undefined);
    setGone(true);
  });

  async function openLinkedIn() {
    try { await navigator.clipboard.writeText(body); } catch {}
    if (item.contact.linkedin_url) window.open(item.contact.linkedin_url, "_blank");
    setOpened(true);
  }

  return (
    <article className={`space-y-3 p-4 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/contacts/${item.contact.id}`} className="min-w-0">
          <div className="truncate font-medium">{item.contact.name}</div>
          <div className="truncate text-sm text-muted">{item.contact.subtitle}</div>
        </Link>
        <span className="shrink-0 rounded border border-ink px-1.5 py-px text-[11px] font-medium">{KIND_LABEL[item.kind]}</span>
      </div>
      <p className="text-xs text-faint">{item.reason} · {item.channel === "email" ? "Email" : "LinkedIn"}</p>
      {item.subject && <p className="text-sm"><span className="text-faint">Subject </span>{item.subject}</p>}
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
        className="w-full resize-y rounded-md border border-line bg-card px-3 py-2 text-sm leading-relaxed outline-none focus:border-ink" />

      {opened ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-accent-soft p-2 pl-3">
          <span className="text-sm">Sent it?</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpened(false)} className="rounded-md border border-line bg-card px-3 py-1.5 text-sm">Not yet</button>
            <button type="button" onClick={() => finish("sent")} className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink">Mark sent</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {item.channel === "email" && item.contact.email ? (
            <>
              <a href={mailtoHref(item.contact.email, item.subject, body)} onClick={() => setOpened(true)}
                className="flex-1 rounded-md bg-accent py-2 text-center text-sm font-medium text-accent-ink">Email draft</a>
              <a href={gmailComposeHref(item.contact.email, item.subject, body)} target="_blank" rel="noopener noreferrer" onClick={() => setOpened(true)}
                className="rounded-md border border-line px-3 py-2 text-sm font-medium">Gmail</a>
            </>
          ) : (
            <button type="button" onClick={openLinkedIn} className="flex-1 rounded-md bg-accent py-2 text-sm font-medium text-accent-ink">
              Copy and open LinkedIn
            </button>
          )}
          <button type="button" onClick={() => finish("skipped")} className="rounded-md border border-line px-3 py-2 text-sm text-muted">Skip</button>
        </div>
      )}
    </article>
  );
}

export function OutreachQueue({ items, sentToday, canPrepare }: { items: QueueItem[]; sentToday: number; canPrepare: boolean }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Outreach queue</h2>
        {sentToday > 0 && <span className="text-xs text-faint">{sentToday} sent today</span>}
      </div>
      {items.length > 0 ? (
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
          {items.map((i) => <Card key={i.id} item={i} />)}
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-card p-4 text-sm">
          <p className="text-muted">
            {sentToday ? "You're through today's outreach." : "Orbit drafts a few messages a day: intros at your target companies and follow-ups when someone hasn't replied. You edit and send each one."}
          </p>
          {canPrepare && !sentToday && (
            <button type="button" disabled={pending}
              onClick={() => start(async () => setNote(await prepareOutreach()))}
              className="mt-3 w-full rounded-md bg-accent py-2 text-sm font-medium text-accent-ink disabled:opacity-60">
              {pending ? "Drafting…" : "Prepare today's outreach"}
            </button>
          )}
          {note && <p className="mt-2 text-xs text-muted">{note}</p>}
        </div>
      )}
      <p className="mt-2 text-[11px] text-faint">Drafts only. Nothing is sent unless you send it.</p>
    </section>
  );
}
