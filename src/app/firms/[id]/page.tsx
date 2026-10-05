import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { ContactRow } from "@/components/ContactRow";
import { StageBadge } from "@/components/StageBadge";
import { approachability, FIRM_CATEGORIES, FIRM_STAGES, worksAt, type Firm } from "@/lib/firms";
import { fullName, type ContactStatus } from "@/lib/types";
import { deleteFirm, updateFirm } from "../../firm-actions";

const field = "w-full rounded-md border border-line bg-card px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-accent";

function nextMove(f: Firm, known: ContactStatus[], cold: ContactStatus[]) {
  const best = known[0];
  if (f.stage === "Offer" || f.stage === "Closed") return null;
  if (f.stage === "Interviewing") return best ? `Ask ${best.first_name} what interviews there focus on.` : "Prep for interviews. Find someone who's been through it.";
  if (!known.length && cold.length) return `Reach out to ${Math.min(3, cold.length)} people below, starting with ${fullName(cold[0])}.`;
  if (!known.length) return "No one you know works here yet. Search LinkedIn for alumni at this company and connect.";
  if (f.stage === "Researching" || f.stage === "Networking") {
    return best.strength === "Warm" || best.strength === "Strong"
      ? `You have a warm contact. Ask ${best.first_name} whether they'd be open to referring you.`
      : `Deepen it: schedule a coffee chat with ${best.first_name}, and reach out to one more person.`;
  }
  if (f.stage === "Applied") return `Let ${best.first_name} know you applied. A heads-up often gets your resume looked at.`;
  return null;
}

export default async function FirmPage({ params }: PageProps<"/firms/[id]">) {
  const { id } = await params;
  const { supabase } = await getUser();
  const { data: f } = await supabase.from("firms").select("*").eq("id", id).maybeSingle<Firm>();
  if (!f) notFound();
  const { data: people } = await supabase.from("contact_status").select("*").not("company", "is", null).limit(5000);
  const at = ((people ?? []) as ContactStatus[]).filter((c) => worksAt(c.company, f));
  const known = at.filter((c) => c.interaction_count > 0).sort((a, b) => b.score - a.score);
  const cold = at.filter((c) => c.interaction_count === 0)
    .sort((a, b) => approachability(b.title) - approachability(a.title));
  const move = nextMove(f, known, cold);

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <Link href="/firms" className="text-sm text-muted">← Companies</Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{f.name}</h1>
          <StageBadge stage={f.stage} />
        </div>
        <p className="text-sm text-muted">
          {[f.category, f.role].filter(Boolean).join(" · ") || "Add the role you're targeting below"}
          {f.deadline && <span className="text-warn"> · due {f.deadline}</span>}
        </p>
      </header>

      <form action={updateFirm.bind(null, f.id)} className="flex flex-wrap gap-2">
        {FIRM_STAGES.map((s) => (
          <button key={s} name="stage" value={s}
            className={`rounded-md border px-3 py-1.5 text-sm ${f.stage === s ? "border-ink bg-ink text-bg" : "border-line bg-card text-muted"}`}>
            {s}
          </button>
        ))}
      </form>

      {move && (
        <section className="rounded-lg border border-accent/15 bg-accent-soft p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-accent">Next move</div>
          <p className="mt-1 text-sm font-medium">{move}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Your relationships here ({known.length})</h2>
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
          {known.map((c) => <ContactRow key={c.id} c={c} hint={c.stage !== "New" ? c.stage : undefined} />)}
          {!known.length && <p className="rounded-lg border border-line bg-card p-4 text-sm text-muted">No conversations with anyone here yet.</p>}
        </div>
      </section>

      {cold.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Connected, not contacted ({cold.length})</h2>
          <p className="mb-2 text-xs text-muted">Analysts and associates usually reply to students fastest. Open someone and tap Build memory to draft a first message.</p>
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">{cold.slice(0, 15).map((c) => <ContactRow key={c.id} c={c} hint="reach out" />)}</div>
        </section>
      )}

      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="text-sm font-semibold">Details</h2>
        <form action={updateFirm.bind(null, f.id)} className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input name="role" defaultValue={f.role ?? ""} placeholder="Role (e.g. TAS Intern)" className={field} />
            <input name="deadline" type="date" defaultValue={f.deadline ?? ""} className={field} />
            <select name="category" defaultValue={f.category ?? ""} className={field}>
              <option value="">Type</option>
              {FIRM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select name="priority" defaultValue={String(f.priority)} className={field}>
              <option value="1">★ Dream company</option>
              <option value="2">Target</option>
              <option value="3">Backup</option>
            </select>
          </div>
          <input name="aliases" defaultValue={f.aliases.join(", ")} placeholder="Other names on LinkedIn (e.g. A&M)" className={field} />
          <textarea name="notes" rows={3} defaultValue={f.notes ?? ""} placeholder="Recruiting timeline, what they look for, interview notes…" className={field} />
          <button className="text-sm font-medium text-accent">Save</button>
        </form>
      </section>

      <form action={deleteFirm.bind(null, f.id)} className="text-center">
        <button className="text-sm text-muted">Remove company</button>
      </form>
    </div>
  );
}
