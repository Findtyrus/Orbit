"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { buildBrainsFor } from "@/lib/jobs";
import { claimAI } from "@/lib/limits";
import { getAI, type Resume } from "@/lib/ai/service";

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
    target_roles: [...new Set([...form.getAll("target_roles").map(String), ...list(form.get("other_roles"))])],
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

/** Finish or skip the walkthrough; either way it won't show again. */
export async function finishTour() {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from("profiles").update({ tour_done_at: new Date().toISOString() }).eq("user_id", user.id);
  revalidatePath("/");
}

export async function replayTour() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  await supabase.from("profiles").update({ tour_done_at: null }).eq("user_id", user.id);
  redirect("/");
}

export type ResumeResult = { ok: true; summary: string } | { ok: false; error: string };

/** Read a resume PDF with AI and keep only the extracted background (the file itself is not stored). */
export async function uploadResume(_prev: ResumeResult | null, form: FormData): Promise<ResumeResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const file = form.get("resume");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose your resume PDF." };
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return { ok: false, error: "Upload a PDF." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "That file is over 5 MB. Export a smaller PDF." };

  const blocked = await claimAI(user.id, "asks");
  if (blocked) return { ok: false, error: blocked };

  let resume: Resume;
  try {
    resume = await (await getAI()).parseResume(Buffer.from(await file.arrayBuffer()).toString("base64"));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't read that resume." };
  }

  // Fill empty profile fields from the resume; never overwrite what the user typed.
  const { data: p } = await supabase.from("profiles").select("school, grad_year, about").eq("user_id", user.id).maybeSingle();
  const edu = resume.education[0];
  await supabase.from("profiles").upsert({
    user_id: user.id,
    resume,
    resume_updated_at: new Date().toISOString(),
    ...(!p?.school && edu?.school ? { school: edu.school } : {}),
    ...(!p?.grad_year && edu?.grad_year ? { grad_year: edu.grad_year } : {}),
    ...(!p?.about ? { about: resume.summary } : {}),
  });
  revalidatePath("/", "layout");
  return { ok: true, summary: resume.summary };
}

export async function removeResume() {
  const { supabase, user } = await getUser();
  if (!user) return;
  await supabase.from("profiles").update({ resume: null, resume_updated_at: null }).eq("user_id", user.id);
  revalidatePath("/", "layout");
}
