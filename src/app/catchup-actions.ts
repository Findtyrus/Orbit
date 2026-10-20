"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/brain";
import { claimAI } from "@/lib/limits";
import { getAI } from "@/lib/ai/service";
import { fullName, isoDate } from "@/lib/types";

/** One change Orbit proposes. Ids are resolved on the server; the student approves before anything is written. */
export type CatchUpItem = {
  key: string;
  action: "close_loop" | "log_note" | "new_loop";
  loopId?: string;
  personId?: string;
  person?: string;
  text: string;
  owner?: "me" | "them";
  dueOn?: string | null;
  occurredOn?: string | null;
  summary: string;
};
export type CatchUpResult = { ok: true; items: CatchUpItem[]; unmatched: string[] } | { ok: false; error: string };

const MAX_CHARS = 4000;
const date = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export async function proposeCatchUp(_prev: CatchUpResult | null, form: FormData): Promise<CatchUpResult> {
  const text = String(form.get("text") ?? "").trim().slice(0, MAX_CHARS);
  if (text.length < 8) return { ok: false, error: "Write a sentence or two about what you've done." };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "AI isn't configured." };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const blocked = await claimAI(user.id, "asks");
  if (blocked) return { ok: false, error: blocked };

  // Only people whose names appear in the text are sent, which keeps this fast and cheap.
  const words = new Set(text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []);
  const [{ data: all }, { data: loops }, me] = await Promise.all([
    supabase.from("contacts").select("id, first_name, last_name, title, company").limit(5000),
    supabase.from("commitments").select("id, contact_id, text, owner, due_on").eq("status", "open").order("due_on", { nullsFirst: false }).limit(120),
    loadProfile(supabase, user.id),
  ]);
  const people = (all ?? []).filter((c) => {
    const f = (c.first_name ?? "").toLowerCase(), l = (c.last_name ?? "").toLowerCase();
    return (f.length > 2 && words.has(f)) || (l.length > 2 && words.has(l));
  });
  // Full-name matches first, then partial, capped.
  const full = (c: (typeof people)[number]) =>
    words.has((c.first_name ?? "").toLowerCase()) && words.has((c.last_name ?? "").toLowerCase()) ? 0 : 1;
  const candidates = [...people].sort((a, b) => full(a) - full(b)).slice(0, 40);
  const byId = new Map((all ?? []).map((c) => [c.id, c]));
  const personRefs = candidates.map((c, i) => ({ ref: `P${i + 1}`, c }));
  const openLoops = (loops ?? []).filter((l) => byId.has(l.contact_id));
  const loopRefs = openLoops.map((l, i) => ({ ref: `L${i + 1}`, l }));

  try {
    const res = await (await getAI()).catchUp({
      today: isoDate(), me, text,
      people: personRefs.map(({ ref, c }) => `${ref} ${fullName(c)} | ${[c.title, c.company].filter(Boolean).join(" @ ") || "role unknown"}`).join("\n"),
      loops: loopRefs.map(({ ref, l }) => `${ref} ${fullName(byId.get(l.contact_id)!)}: ${l.text} (${l.owner === "me" ? "I owe it" : "they owe it"}${l.due_on ? `, due ${l.due_on}` : ""})`).join("\n"),
    });
    const items: CatchUpItem[] = [];
    res.updates.forEach((u, i) => {
      const person = personRefs.find((p) => p.ref === u.person_ref?.trim())?.c;
      const loop = loopRefs.find((x) => x.ref === u.loop_ref?.trim())?.l;
      const base = { key: String(i), text: u.text.trim(), summary: u.summary.trim() };
      if (u.action === "close_loop" && loop) {
        items.push({ ...base, action: "close_loop", loopId: loop.id, person: fullName(byId.get(loop.contact_id)!) });
      } else if (u.action === "log_note" && person && base.text) {
        items.push({ ...base, action: "log_note", personId: person.id, person: fullName(person), occurredOn: date(u.occurred_on) });
      } else if (u.action === "new_loop" && person && base.text) {
        items.push({ ...base, action: "new_loop", personId: person.id, person: fullName(person), owner: u.owner ?? "me", dueOn: date(u.due_on) });
      }
    });
    return { ok: true, items, unmatched: res.unmatched };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Writes the changes the student approved. Row-level security keeps every write inside their own account. */
export async function applyCatchUp(items: CatchUpItem[]): Promise<string | null> {
  const { supabase, user } = await getUser();
  if (!user) return "Not signed in.";
  const now = new Date().toISOString();
  for (const it of items.slice(0, 60)) {
    if (it.action === "close_loop" && it.loopId) {
      await supabase.from("commitments").update({ status: "done", closed_at: now }).eq("id", it.loopId);
    } else if (it.action === "log_note" && it.personId) {
      await supabase.from("interactions").insert({
        contact_id: it.personId, kind: "note", direction: null, subject: "Catch up",
        body: it.text.slice(0, 2000), occurred_at: it.occurredOn ? `${it.occurredOn}T12:00:00Z` : now,
      });
    } else if (it.action === "new_loop" && it.personId) {
      await supabase.from("commitments").insert({
        contact_id: it.personId, text: it.text.slice(0, 300), source: "manual",
        owner: it.owner === "them" ? "them" : "me", due_on: date(it.dueOn),
      });
    }
  }
  revalidatePath("/", "layout");
  return null;
}
