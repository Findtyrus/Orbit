import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { ContactRow } from "@/components/ContactRow";
import type { ContactStatus } from "@/lib/types";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "starred", label: "★ Starred" },
  { key: "talked", label: "Talked to" },
  { key: "tracked", label: "Keeping in touch" },
];

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = typeof sp.f === "string" ? sp.f : "all";
  const { supabase } = await getUser();

  let query = supabase.from("contact_status").select("*");
  if (q) {
    const term = q.replace(/[%,()]/g, " ");
    query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,company.ilike.%${term}%,title.ilike.%${term}%`);
  }
  if (filter === "starred") query = query.eq("starred", true);
  if (filter === "talked") query = query.gt("interaction_count", 0);
  if (filter === "tracked") query = query.not("cadence_days", "is", null);
  const { data } = await query
    .order("last_interaction_at", { ascending: false, nullsFirst: false })
    .order("connected_on", { ascending: false, nullsFirst: false })
    .limit(200);
  const contacts = (data ?? []) as ContactStatus[];

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">People</h1>
      <Link href="/ask" className="flex items-center justify-between rounded-lg border border-accent/15 bg-accent-soft px-4 py-3">
        <div>
          <div className="text-sm font-medium text-accent">Ask your network</div>
          <div className="text-xs text-muted">&ldquo;Who do I know who went from audit to TAS?&rdquo;</div>
        </div>
        <span className="text-accent">→</span>
      </Link>
      <form>
        <input type="hidden" name="f" value={filter} />
        <input name="q" defaultValue={q} placeholder="Search name, company, title…" type="search"
          className="w-full rounded-md border border-line bg-card px-4 py-3 outline-none placeholder:text-faint focus:border-accent" />
      </form>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <a key={f.key} href={`/contacts?f=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`shrink-0 rounded-md border px-3 py-1.5 text-sm ${filter === f.key ? "border-ink bg-ink text-bg" : "border-line bg-card text-muted"}`}>
            {f.label}
          </a>
        ))}
      </div>
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
        {contacts.map((c) => <ContactRow key={c.id} c={c} />)}
        {!contacts.length && <p className="p-4 text-center text-sm text-muted">No one matches.</p>}
        {contacts.length === 200 && <p className="p-2 text-center text-xs text-muted">Showing the first 200. Search to narrow it down.</p>}
      </div>
    </div>
  );
}
