import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { FIRM_CATEGORIES, FIRM_STAGES, worksAt, type Firm } from "@/lib/firms";
import { shortDate, type ContactStatus } from "@/lib/types";
import { addFirm, seedFirms } from "../firm-actions";
import { StageBadge } from "@/components/StageBadge";

export default async function FirmsPage() {
  const { supabase, user } = await getUser();
  let { data: firms } = await supabase.from("firms").select("*").order("priority").order("name");
  if (!firms?.length) {
    const { data: p } = await supabase.from("profiles").select("target_firms").eq("user_id", user!.id).maybeSingle();
    if (p?.target_firms?.length) {
      await seedFirms(p.target_firms);
      ({ data: firms } = await supabase.from("firms").select("*").order("priority").order("name"));
    }
  }
  const { data: people } = await supabase.from("contact_status")
    .select("id, company, strength, interaction_count").not("company", "is", null).limit(5000);

  const rows = ((firms ?? []) as Firm[]).map((f) => {
    const at = ((people ?? []) as Pick<ContactStatus, "id" | "company" | "strength" | "interaction_count">[])
      .filter((c) => worksAt(c.company, f));
    return {
      f,
      total: at.length,
      warm: at.filter((c) => c.strength === "Warm" || c.strength === "Strong").length,
      talked: at.filter((c) => c.interaction_count > 0).length,
    };
  });
  const active = rows.filter((r) => r.f.stage !== "Closed");
  const closed = rows.filter((r) => r.f.stage === "Closed");

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
        <p className="mt-1 text-muted">Your recruiting pipeline and who you know at each company.</p>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto text-center">
        {FIRM_STAGES.filter((s) => s !== "Closed").map((s) => (
          <div key={s} className="min-w-20 shrink-0 rounded-lg border border-line bg-card px-3 py-2">
            <div className="text-lg font-semibold">{rows.filter((r) => r.f.stage === s).length}</div>
            <div className="text-[11px] text-muted">{s}</div>
          </div>
        ))}
      </div>

      <form action={addFirm} className="flex gap-2">
        <input name="name" required placeholder="Add a company, e.g. Deloitte"
          className="min-w-0 flex-1 rounded-md border border-line bg-card px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-accent" />
        <select name="category" className="w-28 rounded-md border border-line bg-card px-2 text-sm">
          <option value="">Type</option>
          {FIRM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="rounded-md bg-accent px-4 text-sm font-medium text-accent-ink">Add</button>
      </form>

      <div className="space-y-2">
        {active.map(({ f, total, warm, talked }) => (
          <Link key={f.id} href={`/firms/${f.id}`} className="block rounded-lg border border-line bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{f.name}</span>
                  {f.priority === 1 && <span className="text-xs text-accent">★ dream</span>}
                </div>
                <div className="text-xs text-muted">{[f.category, f.role].filter(Boolean).join(" · ") || "Add role and type"}</div>
              </div>
              <StageBadge stage={f.stage} />
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 whitespace-nowrap text-sm">
              <span><b>{total}</b> <span className="text-muted">people</span></span>
              <span><b>{talked}</b> <span className="text-muted">talked to</span></span>
              <span><b>{warm}</b> <span className="text-muted">warm</span></span>
              {f.deadline && <span className="ml-auto text-xs font-medium text-warn">Due {shortDate(f.deadline)}</span>}
            </div>
          </Link>
        ))}
        {!active.length && (
          <p className="rounded-lg border border-line bg-card p-4 text-sm text-muted">
            Add the companies you&apos;re recruiting for. Orbit finds everyone you know there and tracks each one from
            networking to offer.
          </p>
        )}
      </div>

      {closed.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">Closed ({closed.length})</summary>
          <div className="mt-2 space-y-1">
            {closed.map(({ f }) => <Link key={f.id} href={`/firms/${f.id}`} className="block rounded-md border border-line bg-card px-4 py-2">{f.name}</Link>)}
          </div>
        </details>
      )}
    </div>
  );
}
