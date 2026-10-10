"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { buildBrainsFor } from "@/lib/jobs";
import { getUser } from "@/lib/supabase/server";
import { trackOnce } from "@/lib/track";
import { readLinkedInFiles, type LinkedInMessage } from "@/lib/linkedin";

export type ImportResult =
  | { ok: true; connections: number; newFromMessages: number; messages: number; cadenceSet: number }
  | { ok: false; error: string };

const DEFAULT_CADENCE_DAYS = 60;
const chunk = <T,>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { first_name: parts[0] ?? "", last_name: parts.slice(1).join(" ") };
}

/** Stable id for a message so re-importing the same export never duplicates it. */
function messageKey(m: LinkedInMessage) {
  return `${m.conversationId}|${m.sentAt}|${m.fromSlug ?? m.fromName}`;
}

export async function importLinkedIn(_prev: ImportResult | null, form: FormData): Promise<ImportResult> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, error: "Choose your LinkedIn export .zip (or Connections.csv / messages.csv)." };

  const { connections, messages, meSlug, profile } = await readLinkedInFiles(files);

  // Seed your own profile (context for the AI) the first time.
  if (profile) {
    const { data: existing } = await supabase.from("profiles").select("name, about").maybeSingle();
    if (!existing?.about) {
      await supabase.from("profiles").upsert({
        user_id: user.id,
        name: existing?.name || profile.name,
        about: [profile.headline, profile.summary].filter(Boolean).join("\n\n"),
      });
    }
  }
  if (!connections.length && !messages.length) {
    return { ok: false, error: "No Connections.csv or messages.csv found in that upload." };
  }

  // 1. Connections: upsert only LinkedIn-owned fields so stage, cadence and notes you set are never overwritten.
  // Rows in one bulk upsert must share columns (missing ones become NULL), so emails go in their own batches.
  const withEmail = connections.filter((c) => c.email);
  const withoutEmail = connections.filter((c) => !c.email);
  for (const batch of [...chunk(withEmail, 500), ...chunk(withoutEmail, 500)]) {
    const { error } = await supabase.from("contacts").upsert(
      batch.map((c) => ({
        user_id: user.id,
        linkedin_slug: c.slug,
        linkedin_url: c.url,
        first_name: c.firstName,
        last_name: c.lastName,
        company: c.company,
        title: c.title,
        connected_on: c.connectedOn,
        source: "linkedin_connection",
        ...(c.email ? { email: c.email } : {}),
      })),
      { onConflict: "user_id,linkedin_slug" },
    );
    if (error) return { ok: false, error: `Saving connections failed: ${error.message}` };
  }

  // 2. People you've messaged who aren't (or are no longer) connections.
  const counterparts = new Map<string, string>(); // slug -> display name
  for (const m of messages) {
    if (m.fromSlug && m.fromSlug !== meSlug) counterparts.set(m.fromSlug, m.fromName);
    const others = m.toSlugs.filter((s) => s !== meSlug);
    if (others.length === 1 && m.fromSlug === meSlug) counterparts.set(others[0], m.toNames.join(", "));
  }
  const connected = new Set(connections.map((c) => c.slug));
  const extra = [...counterparts].filter(([slug]) => !connected.has(slug));
  let newFromMessages = 0;
  for (const batch of chunk(extra, 500)) {
    const { data, error } = await supabase
      .from("contacts")
      .upsert(
        batch.map(([slug, name]) => ({
          user_id: user.id,
          linkedin_slug: slug,
          linkedin_url: `https://www.linkedin.com/in/${slug}`,
          source: "linkedin_message",
          ...splitName(name),
        })),
        { onConflict: "user_id,linkedin_slug", ignoreDuplicates: true },
      )
      .select("id");
    if (error) return { ok: false, error: `Saving message contacts failed: ${error.message}` };
    newFromMessages += data?.length ?? 0;
  }

  // 3. Messages -> interactions on each counterpart's timeline.
  const idBySlug = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("contacts")
      .select("id, linkedin_slug")
      .not("linkedin_slug", "is", null)
      .range(from, from + 999);
    if (error) return { ok: false, error: error.message };
    data.forEach((r) => idBySlug.set(r.linkedin_slug, r.id));
    if (data.length < 1000) break;
  }

  const rows: Record<string, unknown>[] = [];
  const twoWay = new Map<string, { in: boolean; out: boolean }>();
  for (const m of messages) {
    const outbound = m.fromSlug === meSlug;
    const people = outbound ? m.toSlugs.filter((s) => s !== meSlug) : m.fromSlug ? [m.fromSlug] : [];
    for (const slug of people) {
      const contactId = idBySlug.get(slug);
      if (!contactId) continue;
      rows.push({
        user_id: user.id,
        contact_id: contactId,
        kind: "linkedin_message",
        direction: outbound ? "out" : "in",
        occurred_at: m.sentAt,
        subject: m.subject,
        body: m.content.slice(0, 8000),
        external_id: messageKey(m),
      });
      const t = twoWay.get(contactId) ?? { in: false, out: false };
      t[outbound ? "out" : "in"] = true;
      twoWay.set(contactId, t);
    }
  }
  for (const batch of chunk(rows, 500)) {
    const { error } = await supabase
      .from("interactions")
      .upsert(batch, { onConflict: "user_id,contact_id,kind,external_id", ignoreDuplicates: true });
    if (error) return { ok: false, error: `Saving messages failed: ${error.message}` };
  }

  // 4. Anyone you've had a real back-and-forth with gets a keep-in-touch reminder (only if none is set yet).
  const conversational = [...twoWay].filter(([, t]) => t.in && t.out).map(([id]) => id);
  let cadenceSet = 0;
  for (const batch of chunk(conversational, 100)) {
    const { data, error } = await supabase
      .from("contacts")
      .update({ cadence_days: DEFAULT_CADENCE_DAYS })
      .in("id", batch)
      .is("cadence_days", null)
      .select("id");
    if (error) return { ok: false, error: error.message };
    cadenceSet += data?.length ?? 0;
  }

  // Write memories for people with history in the background (skipped until onboarding is finished).
  const { data: prof } = await supabase.from("profiles").select("onboarded_at").maybeSingle();
  if (prof?.onboarded_at) after(() => buildBrainsFor(user.id));

  revalidatePath("/", "layout");
  if (connections.length) await trackOnce(user.id, "linkedin_import", { connections: connections.length });
  return { ok: true, connections: connections.length, newFromMessages, messages: rows.length, cadenceSet };
}
