"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { buildBrainsFor } from "@/lib/jobs";

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 30);

export async function saveProfile(form: FormData) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const year = Number(form.get("grad_year"));
  await supabase.from("profiles").upsert({
    user_id: user.id,
    name: String(form.get("name") ?? "").trim(),
    school: String(form.get("school") ?? "").trim(),
    location: String(form.get("location") ?? "").trim(),
    grad_year: Number.isInteger(year) && year > 1950 ? year : null,
    target_roles: form.getAll("target_roles").map(String),
    target_firms: list(form.get("target_firms")),
    about: String(form.get("about") ?? ""),
    goals: String(form.get("goals") ?? ""),
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/", "layout");
  const next = String(form.get("next") ?? "");
  if (next.startsWith("/")) redirect(next);
}

export async function finishOnboarding() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("user_id", user.id);
  // Start writing relationship memories right away; the daily job finishes anything left over.
  after(() => buildBrainsFor(user.id));
  redirect("/?welcome=1");
}
