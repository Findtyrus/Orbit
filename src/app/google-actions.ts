"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { syncGoogle, type SyncSummary } from "@/lib/google";
import { loadProfile } from "@/lib/brain";
import { limitMessage, spendAI } from "@/lib/limits";
import { getAI, type MeetingPrep, type TimelineEntry } from "@/lib/ai/service";
import { fullName, isoDate, type ContactStatus, type Synopsis } from "@/lib/types";

export async function syncNow(): Promise<SyncSummary> {
  const { user } = await getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const result = await syncGoogle(user.id);
  revalidatePath("/", "layout");
  return result;
}

export async function prepMeeting(meetingId: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return "Add ANTHROPIC_API_KEY to .env.local to generate briefs.";
  const { supabase, user } = await getUser();
  if (!user) return "Not signed in.";
  const { data: m } = await supabase.from("meetings").select("*").eq("id", meetingId).single();
  if (!m) return "Meeting not found.";
  if (!(await spendAI(user.id, "preps"))) return limitMessage("preps");

  const ids: string[] = m.contact_ids ?? [];
  const [{ data: people }, { data: syn }, { data: loops }, { data: rows }, me] = await Promise.all([
    supabase.from("contact_status").select("*").in("id", ids),
    supabase.from("synopses").select("*").in("contact_id", ids),
    supabase.from("commitments").select("contact_id, text").in("contact_id", ids).eq("status", "open"),
    supabase.from("interactions").select("contact_id, kind, direction, occurred_at, subject, body")
      .in("contact_id", ids).order("occurred_at", { ascending: false }).limit(60),
    loadProfile(supabase, user.id),
  ]);
  const synBy = new Map(((syn ?? []) as Synopsis[]).map((s) => [s.contact_id, s]));

  const attendees = ((people ?? []) as ContactStatus[]).map((c) => {
    const s = synBy.get(c.id);
    const recent: TimelineEntry[] = (rows ?? []).filter((r) => r.contact_id === c.id).slice(0, 15).reverse().map((r) => ({
      at: r.occurred_at, kind: r.kind.replace("_", " "),
      from: r.direction === "out" ? "me" : r.direction === "in" ? "them" : "note",
      subject: r.subject, body: r.body ?? "",
    }));
    return {
      name: fullName(c),
      role: [c.title, c.company].filter(Boolean).join(" at ") || "role unknown",
      strength: `${c.strength} (${c.score}/100)`,
      memory: s ? `${s.summary} Facts: ${JSON.stringify(s.facts)}` : null,
      openLoops: (loops ?? []).filter((l) => l.contact_id === c.id).map((l) => l.text),
      recent,
    };
  });
  // Guests who aren't contacts still give the model useful context.
  const known = new Set(attendees.map((a) => a.name.toLowerCase()));
  for (const a of (m.attendees ?? []) as { email: string; name: string | null }[]) {
    if (!a.name || !known.has(a.name.toLowerCase())) {
      attendees.push({ name: a.name ?? a.email, role: a.email, strength: "unknown", memory: null, openLoops: [], recent: [] });
    }
  }

  let prep: MeetingPrep;
  try {
    prep = await (await getAI()).prepMeeting({
      today: isoDate(),
      me,
      meeting: {
        title: m.title,
        start: new Date(m.start_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" }),
        description: m.description,
        location: m.location,
      },
      attendees,
    });
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  await supabase.from("meetings").update({ prep }).eq("id", meetingId);
  revalidatePath(`/meetings/${meetingId}`);
  return null;
}

export async function markDebriefed(meetingId: string) {
  const { supabase } = await getUser();
  await supabase.from("meetings").update({ debriefed: true }).eq("id", meetingId);
  revalidatePath("/");
}
