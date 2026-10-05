"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { buildQueue } from "@/lib/outreach";

export async function prepareOutreach(): Promise<string | null> {
  const { supabase, user } = await getUser();
  if (!user) return "Not signed in.";
  if (!process.env.ANTHROPIC_API_KEY) return "AI isn't configured.";
  const { made, error } = await buildQueue(supabase, user.id);
  revalidatePath("/");
  if (error) return error;
  return made ? null : "Nothing to queue right now. Add target companies on the Companies tab, or check back after more conversations.";
}

/** The user sent it (themselves) or skipped it. Sending logs the message so follow-up tracking works. */
export async function resolveOutreach(id: string, status: "sent" | "skipped", body?: string) {
  const { supabase } = await getUser();
  const { data: item } = await supabase.from("outreach_queue")
    .update({ status, acted_at: new Date().toISOString(), ...(body ? { body } : {}) })
    .eq("id", id).select("contact_id, kind, channel, subject, body").single();
  if (item && status === "sent") {
    await supabase.from("interactions").insert({
      contact_id: item.contact_id,
      kind: item.channel === "email" ? "email" : "linkedin_message",
      direction: "out",
      occurred_at: new Date().toISOString(),
      subject: item.subject,
      body: item.body,
      external_id: `outreach:${id}`,
    });
    if (item.kind === "intro") {
      await supabase.from("contacts").update({ stage: "Reached out" }).eq("id", item.contact_id).eq("stage", "New");
    }
  }
  revalidatePath("/");
}
