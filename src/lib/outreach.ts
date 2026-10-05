import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAI, type OutreachInput, type TimelineEntry } from "./ai/service";
import { loadProfile } from "./brain";
import { approachability, worksAt, type Firm } from "./firms";
import { spendAI } from "./limits";
import { fullName, isoDate, type ContactStatus } from "./types";

const DAILY_TARGET = 5;
const COOLDOWN_DAYS = 14; // don't suggest the same person again for two weeks

type QueuePick = { c: ContactStatus; kind: OutreachInput["kind"]; reason: string; firm?: string };

/**
 * Build today's outreach queue: follow-ups first (they're time-sensitive), then a check-in, then cold intros
 * at target firms. Drafts only — the user sends every message themselves. Safe to call repeatedly.
 */
export async function buildQueue(db: SupabaseClient, userId: string): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) return 0;
  const today = isoDate();
  const [{ data: existing }, { data: people }, { data: firms }] = await Promise.all([
    db.from("outreach_queue").select("contact_id, for_date").eq("user_id", userId).gte("for_date", isoDate(-COOLDOWN_DAYS)),
    db.from("contact_status").select("*").eq("user_id", userId).limit(5000),
    db.from("firms").select("id, name, aliases, stage, priority").eq("user_id", userId).neq("stage", "Closed").order("priority"),
  ]);
  const queuedToday = (existing ?? []).filter((e) => e.for_date === today).length;
  const room = DAILY_TARGET - queuedToday;
  if (room <= 0) return 0;

  const recentlyQueued = new Set((existing ?? []).map((e) => e.contact_id));
  const reachable = ((people ?? []) as ContactStatus[]).filter((c) =>
    !recentlyQueued.has(c.id) && (c.email || c.linkedin_url) && !(c.snoozed_until && c.snoozed_until > today));

  const picks: QueuePick[] = [];
  const add = (p: QueuePick) => { if (picks.length < room && !picks.some((x) => x.c.id === p.c.id)) picks.push(p); };

  // 1. No reply yet: oldest unanswered message first.
  reachable.filter((c) => c.awaiting_reply)
    .sort((a, b) => (a.last_interaction_at ?? "").localeCompare(b.last_interaction_at ?? ""))
    .slice(0, 2)
    .forEach((c) => add({
      c, kind: "follow_up",
      reason: `No reply in ${Math.round((Date.parse(today) - Date.parse(c.last_interaction_at!)) / 86_400_000)} days`,
    }));

  // 2. One real relationship that's due for a check-in.
  reachable.filter((c) => c.next_due && c.next_due <= today && c.interaction_count > 0 && !c.awaiting_reply)
    .sort((a, b) => b.score - a.score)
    .slice(0, 1)
    .forEach((c) => add({ c, kind: "check_in", reason: "Due for a check-in" }));

  // 3. Cold intros at target firms, rotating across firms so one firm doesn't take the whole day.
  const targets = (firms ?? []) as Pick<Firm, "id" | "name" | "aliases" | "stage" | "priority">[];
  const pools = targets.map((f) => ({
    f,
    people: reachable.filter((c) => c.interaction_count === 0 && c.stage === "New" && worksAt(c.company, f))
      .sort((a, b) => approachability(b.title) - approachability(a.title)),
  }));
  for (let round = 0; picks.length < room && pools.some((p) => p.people[round]); round++) {
    for (const { f, people: ps } of pools) {
      if (ps[round]) add({ c: ps[round], kind: "intro", reason: `At ${f.name}, a target firm. You've never messaged`, firm: f.name });
    }
  }
  if (!picks.length) return 0;

  // Spend the allowance up front; trim the queue if the user is near their daily cap.
  let n = picks.length;
  while (n > 0 && !(await spendAI(userId, "drafts", n))) n--;
  if (!n) return 0;

  const me = await loadProfile(db, userId);
  const { data: syn } = await db.from("synopses").select("contact_id, summary").eq("user_id", userId)
    .in("contact_id", picks.slice(0, n).map((p) => p.c.id));
  const memoryOf = new Map((syn ?? []).map((s) => [s.contact_id, s.summary]));
  const ai = await getAI();

  const rows = await Promise.all(picks.slice(0, n).map(async (p) => {
    const { data: hist } = await db.from("interactions").select("kind, direction, occurred_at, body")
      .eq("contact_id", p.c.id).eq("user_id", userId).order("occurred_at", { ascending: false }).limit(6);
    const recent: TimelineEntry[] = (hist ?? []).reverse().map((r) => ({
      at: r.occurred_at, kind: r.kind, from: r.direction === "out" ? "me" : r.direction === "in" ? "them" : "note", body: r.body ?? "",
    }));
    const channel: OutreachInput["channel"] = p.c.email ? "email" : "linkedin";
    try {
      const draft = await ai.draftOutreach({
        today, me, kind: p.kind, channel, recent, memory: memoryOf.get(p.c.id) ?? null,
        person: { name: fullName(p.c), title: p.c.title, company: p.c.company, isTargetFirm: !!p.firm },
      });
      return {
        user_id: userId, contact_id: p.c.id, kind: p.kind, reason: p.reason, channel,
        subject: channel === "email" ? draft.subject || null : null, body: draft.body, for_date: today,
      };
    } catch (e) {
      console.error("outreach draft failed", e);
      return null;
    }
  }));
  const ok = rows.filter((r) => r !== null);
  if (ok.length) await db.from("outreach_queue").upsert(ok, { onConflict: "user_id,contact_id,for_date", ignoreDuplicates: true });
  return ok.length;
}
