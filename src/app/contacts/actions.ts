"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { buildBrain } from "@/lib/brain";
import { spendAI } from "@/lib/limits";

async function done(id: string) {
  revalidatePath(`/contacts/${id}`);
  revalidatePath("/");
}

export async function setCadence(id: string, form: FormData) {
  const { supabase } = await getUser();
  const raw = String(form.get("cadence") ?? "");
  await supabase.from("contacts").update({ cadence_days: raw ? Number(raw) : null }).eq("id", id);
  await done(id);
}

export async function toggleStar(id: string, starred: boolean) {
  const { supabase } = await getUser();
  await supabase.from("contacts").update({ starred: !starred }).eq("id", id);
  await done(id);
}

export async function snooze(id: string, days: number) {
  const { supabase } = await getUser();
  const until = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  await supabase.from("contacts").update({ snoozed_until: until }).eq("id", id);
  await done(id);
}

/** Log a touchpoint: a note to self, a call, or "I reached out". Resets the keep-in-touch clock. */
export async function logInteraction(id: string, form: FormData) {
  const { supabase, user } = await getUser();
  if (!user) return;
  const kind = String(form.get("kind") ?? "note");
  const body = String(form.get("body") ?? "").trim();
  if (!body && kind === "note") return;
  await supabase.from("interactions").insert({
    contact_id: id,
    kind: kind === "call" ? "call" : "note",
    direction: kind === "note" ? null : "out",
    occurred_at: new Date().toISOString(),
    body: body || (kind === "call" ? "Call" : "Reached out"),
  });
  await supabase.from("contacts").update({ snoozed_until: null }).eq("id", id);
  // Logging how it went closes the "How did it go?" prompt for their recent meetings.
  await supabase.from("meetings").update({ debriefed: true })
    .contains("contact_ids", [id]).lt("end_at", new Date().toISOString()).eq("debriefed", false);
  // Post-conversation capture: let the AI fold what you wrote into their memory and open loops.
  if (body.length > 20 && process.env.ANTHROPIC_API_KEY) {
    after(async () => {
      try {
        if (await spendAI(user.id, "memories")) await buildBrain(supabase, user.id, id);
      } catch (e) { console.error("brain rebuild failed", e); }
    });
  }
  await done(id);
}

export async function saveNotes(id: string, form: FormData) {
  const { supabase } = await getUser();
  await supabase.from("contacts").update({ notes: String(form.get("notes") ?? "") }).eq("id", id);
  await done(id);
}
