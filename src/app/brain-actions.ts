"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { buildBrain, loadProfile, staleBrainIds } from "@/lib/brain";
import { limitMessage, spendAI } from "@/lib/limits";
import { getAI, type AskAnswer } from "@/lib/ai/service";
import { fullName, isoDate, relDays, type ContactStatus } from "@/lib/types";

const missingKey = () =>
  !process.env.ANTHROPIC_API_KEY ? "Add ANTHROPIC_API_KEY to network-app/.env.local, then restart the app." : null;

export async function refreshBrain(contactId: string): Promise<string | null> {
  if (missingKey()) return missingKey();
  const { supabase, user } = await getUser();
  if (!user) return "Not signed in.";
  if (!(await spendAI(user.id, "memories"))) return limitMessage("memories");
  try {
    await buildBrain(supabase, user.id, contactId);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/");
  return null;
}

export type BatchResult = { built: number; remaining: number; errors: string[] };

/** Build memories for the next batch of people with new history. The client calls this repeatedly. */
export async function buildBrains(): Promise<BatchResult> {
  const keyErr = missingKey();
  if (keyErr) return { built: 0, remaining: 0, errors: [keyErr] };
  const { supabase, user } = await getUser();
  if (!user) return { built: 0, remaining: 0, errors: ["Not signed in."] };
  const { ids, remaining } = await staleBrainIds(supabase, user.id, 6);
  if (ids.length && !(await spendAI(user.id, "memories", ids.length))) {
    return { built: 0, remaining: 0, errors: [limitMessage("memories")] };
  }
  const results = await Promise.allSettled(ids.map((id) => buildBrain(supabase, user.id, id)));
  const errors = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason?.message ?? r.reason)] : []));
  const built = results.length - errors.length;
  revalidatePath("/", "layout");
  // If every attempt failed, stop the client loop instead of retrying forever.
  return { built, remaining: built === 0 ? 0 : remaining - built, errors };
}

export async function setLoopStatus(id: string, status: "done" | "dismissed" | "open") {
  const { supabase } = await getUser();
  await supabase.from("commitments")
    .update({ status, closed_at: status === "open" ? null : new Date().toISOString() }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function addLoop(contactId: string, form: FormData) {
  const text = String(form.get("text") ?? "").trim();
  if (!text) return;
  const { supabase } = await getUser();
  await supabase.from("commitments").insert({
    contact_id: contactId, text, source: "manual", owner: "me",
    due_on: String(form.get("due_on") ?? "") || null,
  });
  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/");
}

export type AskResult =
  | { ok: true; answer: string; people: (AskAnswer["people"][number] & { id: string; name: string; subtitle: string })[] }
  | { ok: false; error: string };

export async function askNetwork(_prev: AskResult | null, form: FormData): Promise<AskResult> {
  const question = String(form.get("q") ?? "").trim();
  if (!question) return { ok: false, error: "Ask a question." };
  if (missingKey()) return { ok: false, error: missingKey()! };
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!(await spendAI(user.id, "asks"))) return { ok: false, error: limitMessage("asks") };

  const [{ data: people }, { data: syn }, me] = await Promise.all([
    supabase.from("contact_status").select("*").order("score", { ascending: false }).limit(3000),
    supabase.from("synopses").select("contact_id, summary").limit(5000),
    loadProfile(supabase, user.id),
  ]);
  const summaries = new Map((syn ?? []).map((s) => [s.contact_id, s.summary]));
  const list = (people ?? []) as ContactStatus[];
  // Stable order + short refs keep the roster cacheable and cheap.
  const roster = list
    .map((c, i) => {
      const parts = [
        `#${i + 1} ${fullName(c)}`,
        [c.title, c.company].filter(Boolean).join(" @ ") || "role unknown",
        `${c.strength} ${c.score}`,
        `last contact ${relDays(c.last_interaction_at)}`,
        c.tags.length ? `tags: ${c.tags.join(", ")}` : "",
        summaries.get(c.id) ? `memory: ${summaries.get(c.id)}` : "",
      ];
      return parts.filter(Boolean).join(" | ");
    })
    .join("\n");

  try {
    const ai = await getAI();
    const res = await ai.askNetwork({ today: isoDate(), me, roster, question });
    return {
      ok: true,
      answer: res.answer,
      people: res.people.flatMap((p) => {
        const c = list[Number(p.ref.replace(/\D/g, "")) - 1];
        return c ? [{ ...p, id: c.id, name: fullName(c), subtitle: [c.title, c.company].filter(Boolean).join(" · ") }] : [];
      }),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
