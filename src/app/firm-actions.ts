"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { FIRM_STAGES, PERSON_STAGES } from "@/lib/firms";
import { FREE_FIRM_LIMIT, getPlan } from "@/lib/billing";

/** Free accounts can track a few firms; returns how many more this user may add. */
async function firmRoom() {
  const { supabase, user } = await getUser();
  if (!user) return 0;
  if ((await getPlan(supabase, user)).tier === "pro") return Infinity;
  const { count } = await supabase.from("firms").select("id", { count: "exact", head: true }).neq("stage", "Closed");
  return Math.max(0, FREE_FIRM_LIMIT - (count ?? 0));
}

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);

export async function addFirm(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  if ((await firmRoom()) < 1) redirect("/upgrade");
  const { supabase } = await getUser();
  // A duplicate (same name, any capitalization) violates the unique index and is simply ignored.
  await supabase.from("firms").insert({ name, category: String(form.get("category") ?? "") || null });
  revalidatePath("/firms");
}

/** Add the target firms from your profile that aren't tracked yet. */
export async function seedFirms(names: string[]) {
  const { supabase } = await getUser();
  if (!names.length) return;
  const { data: existing } = await supabase.from("firms").select("name");
  const have = new Set((existing ?? []).map((f) => f.name.toLowerCase()));
  const fresh = names.filter((n) => !have.has(n.toLowerCase())).slice(0, await firmRoom());
  if (fresh.length) await supabase.from("firms").insert(fresh.map((name) => ({ name, stage: "Networking" })));
}

export async function updateFirm(id: string, form: FormData) {
  const { supabase } = await getUser();
  const patch: Record<string, unknown> = {};
  const stage = form.get("stage");
  if (stage && (FIRM_STAGES as readonly string[]).includes(String(stage))) patch.stage = stage;
  if (form.has("priority")) patch.priority = Math.min(3, Math.max(1, Number(form.get("priority")) || 2));
  if (form.has("deadline")) patch.deadline = String(form.get("deadline")) || null;
  if (form.has("role")) patch.role = String(form.get("role")).trim() || null;
  if (form.has("category")) patch.category = String(form.get("category")) || null;
  if (form.has("aliases")) patch.aliases = list(form.get("aliases"));
  if (form.has("notes")) patch.notes = String(form.get("notes"));
  await supabase.from("firms").update(patch).eq("id", id);
  revalidatePath(`/firms/${id}`);
  revalidatePath("/firms");
  revalidatePath("/");
}

export async function deleteFirm(id: string) {
  const { supabase } = await getUser();
  await supabase.from("firms").delete().eq("id", id);
  revalidatePath("/firms");
  redirect("/firms");
}

export async function setPersonStageForm(contactId: string, form: FormData) {
  await setPersonStage(contactId, String(form.get("stage") ?? ""));
}

export async function setPersonStage(contactId: string, stage: string) {
  if (!(PERSON_STAGES as readonly string[]).includes(stage)) return;
  const { supabase } = await getUser();
  await supabase.from("contacts").update({ stage }).eq("id", contactId);
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/firms", "layout");
}
