import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAI, type Resume, type TimelineEntry } from "./ai/service";
import { fullName, isoDate } from "./types";

// Keep the newest history when someone has an enormous thread (≈30k tokens of text).
const MAX_TIMELINE_CHARS = 120_000;

export type Me = { name: string; about: string; goals: string };

/**
 * The owner's context for every AI call. Works with either the user's own client or the admin
 * client used by background jobs — always scoped by userId explicitly.
 */
export async function loadProfile(db: SupabaseClient, userId: string): Promise<Me> {
  const { data: p } = await db.from("profiles")
    .select("*")
    .eq("user_id", userId).maybeSingle();
  if (!p) return { name: "Me", about: "", goals: "" };
  const r = p.resume as Resume | null;
  const background = [
    p.school && `Student at ${p.school}${p.grad_year ? `, graduating ${p.grad_year}` : ""}.`,
    p.about,
    r?.summary,
    r?.experience?.length && `Experience: ${r.experience.map((e) => `${e.title} at ${e.company}${e.dates ? ` (${e.dates})` : ""}`).join("; ")}.`,
    r?.education?.length && `Education: ${r.education.map((e) => [e.degree, e.major, e.school, e.grad_year].filter(Boolean).join(", ")).join("; ")}.`,
    r?.activities?.length && `Activities: ${r.activities.join("; ")}.`,
    r?.certifications?.length && `Certifications: ${r.certifications.join(", ")}.`,
    r?.hometown && `Hometown: ${r.hometown}.`,
  ].filter(Boolean).join("\n");
  const goals = [
    p.target_roles?.length && `Recruiting for: ${p.target_roles.join(", ")}.`,
    p.target_firms?.length && `Target companies: ${p.target_firms.join(", ")}.`,
    p.location && `Wants to work in ${p.location}.`,
    p.goals,
  ].filter(Boolean).join("\n");
  return { name: p.name || "Me", about: background, goals };
}

/** Rebuild one contact's memory, open loops and tags from their full history. */
export async function buildBrain(db: SupabaseClient, userId: string, contactId: string) {
  const [{ data: c, error }, { data: rows }, { data: closed }, me] = await Promise.all([
    db.from("contacts").select("*").eq("id", contactId).eq("user_id", userId).single(),
    db.from("interactions").select("kind, direction, occurred_at, subject, body")
      .eq("contact_id", contactId).eq("user_id", userId).order("occurred_at", { ascending: true }),
    db.from("commitments").select("text").eq("contact_id", contactId).eq("user_id", userId).neq("status", "open"),
    loadProfile(db, userId),
  ]);
  if (error || !c) throw new Error(error?.message ?? "Contact not found");

  let timeline: TimelineEntry[] = (rows ?? []).map((r) => ({
    at: r.occurred_at,
    kind: r.kind.replace("_", " "),
    from: r.direction === "out" ? "me" : r.direction === "in" ? "them" : "note",
    subject: r.subject,
    body: r.body ?? "",
  }));
  let chars = 0;
  for (let i = timeline.length - 1; i >= 0; i--) {
    chars += timeline[i].body.length;
    if (chars > MAX_TIMELINE_CHARS) { timeline = timeline.slice(i + 1); break; }
  }

  const ai = await getAI();
  const memory = await ai.buildMemory({
    today: isoDate(),
    me,
    person: { name: fullName(c), title: c.title, company: c.company, connectedOn: c.connected_on, myNotes: c.notes, stage: c.stage },
    timeline,
    closedLoops: (closed ?? []).map((r) => r.text),
  });

  const validDate = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const newest = rows?.length ? rows[rows.length - 1].occurred_at : null;

  const { error: upsertErr } = await db.from("synopses").upsert({
    contact_id: contactId,
    user_id: userId,
    summary: memory.summary,
    facts: memory.facts,
    talking_points: memory.talking_points,
    common_ground: memory.common_ground,
    open_loops: memory.open_loops.map((l) => l.text), // legacy column, kept in sync
    next_step: memory.next_step,
    why_now: memory.why_now,
    suggested_message: memory.suggested_message,
    follow_up_on: validDate(memory.follow_up_on),
    interactions_seen: newest,
    source_count: rows?.length ?? 0,
    generated_at: new Date().toISOString(),
  });
  if (upsertErr) throw new Error(upsertErr.message);

  // AI-found loops are regenerated each time; ones you created or closed are left alone.
  await db.from("commitments").delete()
    .eq("contact_id", contactId).eq("user_id", userId).eq("status", "open").eq("source", "ai");
  if (memory.open_loops.length) {
    await db.from("commitments").insert(memory.open_loops.map((l) => ({
      user_id: userId, contact_id: contactId, text: l.text, owner: l.owner, due_on: validDate(l.due_on),
    })));
  }

  const tags = [...new Set([...(c.tags ?? []), ...memory.tags])].slice(0, 8);
  await db.from("contacts").update({ tags }).eq("id", contactId).eq("user_id", userId);
  return memory;
}

/** Contacts with history whose memory is missing or older than their newest interaction, best relationships first. */
export async function staleBrainIds(db: SupabaseClient, userId: string, limit: number) {
  const [{ data: people }, { data: syn }] = await Promise.all([
    // Only real relationships get memories automatically: they replied, you met or called, or you starred them.
    // Everyone else gets one on demand from their page — this keeps a first import affordable.
    db.from("contact_status").select("id, last_interaction_at, score")
      .eq("user_id", userId).gt("interaction_count", 0)
      .or("last_inbound_at.not.is.null,meeting_count.gt.0,starred.eq.true")
      .order("score", { ascending: false }).limit(2000),
    db.from("synopses").select("contact_id, interactions_seen").eq("user_id", userId).limit(5000),
  ]);
  const seen = new Map((syn ?? []).map((s) => [s.contact_id, s.interactions_seen]));
  const stale = (people ?? []).filter((p) => {
    if (!seen.has(p.id)) return true;
    const s = seen.get(p.id);
    return !s || (p.last_interaction_at && p.last_interaction_at > s);
  });
  return { ids: stale.slice(0, limit).map((p) => p.id), remaining: stale.length };
}
