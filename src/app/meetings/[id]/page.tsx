import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { ContactRow } from "@/components/ContactRow";
import { PrepButton } from "@/components/client";
import type { MeetingPrep } from "@/lib/ai/service";
import type { ContactStatus } from "@/lib/types";
import { inZone, userTimeZone } from "@/lib/tz";

export default async function MeetingPage({ params }: PageProps<"/meetings/[id]">) {
  const { id } = await params;
  const { supabase } = await getUser();
  const z = inZone(await userTimeZone());
  const { data: m } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();
  const { data: people } = await supabase.from("contact_status").select("*").in("id", m.contact_ids ?? []);
  const prep = m.prep as MeetingPrep | null;
  const start = new Date(m.start_at);
  const ended = new Date(m.end_at) < new Date();
  const guests = (m.attendees ?? []) as { email: string; name: string | null }[];

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <p className="text-sm text-muted">
          {z.date(start, { weekday: "long", month: "long", day: "numeric" })} ·{" "}
          {z.time(start)}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
        {m.location && <p className="mt-1 truncate text-sm text-muted">{m.location}</p>}
      </header>

      <section className="rounded-lg border border-accent/15 bg-accent-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-accent">Meeting prep</h2>
          <PrepButton meetingId={m.id} label={prep ? "Regenerate" : "Generate brief"} />
        </div>
        {prep ? (
          <div className="mt-2 space-y-4 text-sm">
            <p className="font-medium">{prep.purpose}</p>
            {prep.context.length > 0 && (
              <div><div className="font-medium">Remember</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">{prep.context.map((x) => <li key={x}>{x}</li>)}</ul></div>
            )}
            <div><div className="font-medium">Your angle</div><p className="mt-1">{prep.your_angle}</p></div>
            <div><div className="font-medium">Questions worth asking</div>
              <ol className="mt-1 list-decimal space-y-1 pl-5">{prep.questions.map((x) => <li key={x}>{x}</li>)}</ol></div>
            <div className="rounded-md border border-line bg-card p-3"><div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">After</div>
              <p className="mt-1">{prep.follow_up}</p></div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">Pulls together who they are, what you&apos;ve discussed, what you owe them, and questions to ask.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">With</h2>
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
          {((people ?? []) as ContactStatus[]).map((c) => <ContactRow key={c.id} c={c} />)}
          {guests.filter((g) => !(people ?? []).some((p) => p.email?.toLowerCase() === g.email.toLowerCase())).map((g) => (
            <div key={g.email} className="rounded-lg border border-line bg-card px-4 py-3 text-sm">{g.name ?? g.email} <span className="text-muted">· not in Orbit</span></div>
          ))}
        </div>
      </section>

      {ended && (people ?? []).length > 0 && (
        <Link href={`/contacts/${people![0].id}#log`} className="block rounded-lg bg-accent p-4 text-center font-medium text-accent-ink">
          How did it go? Capture it →
        </Link>
      )}
      {m.description && (
        <details className="rounded-lg border border-line bg-card p-4 text-sm">
          <summary className="cursor-pointer text-muted">Invite details</summary>
          <p className="mt-2 whitespace-pre-line">{m.description.replace(/<[^>]+>/g, " ")}</p>
        </details>
      )}
    </div>
  );
}
