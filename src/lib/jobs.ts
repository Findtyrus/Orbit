import "server-only";
import { createAdminClient } from "./supabase/admin";
import { buildBrain, staleBrainIds } from "./brain";
import { claimAI } from "./limits";
import { syncGoogle } from "./google";
import { buildQueue } from "./outreach";

const CONCURRENCY = 4;

/**
 * Build memories for a user's people with new history, best relationships first, until the time budget,
 * the daily cap, or the work runs out. Safe to call repeatedly; cron picks up whatever is left.
 */
export async function buildBrainsFor(userId: string, budgetMs = 240_000) {
  if (!process.env.ANTHROPIC_API_KEY) return { built: 0, remaining: 0 };
  const db = createAdminClient();
  const deadline = Date.now() + budgetMs;
  let built = 0;
  for (;;) {
    const { ids, remaining } = await staleBrainIds(db, userId, CONCURRENCY);
    if (!ids.length || Date.now() > deadline - 60_000) return { built, remaining };
    if ((await claimAI(userId, "memories", ids.length)) !== null) return { built, remaining };
    const results = await Promise.allSettled(ids.map((id) => buildBrain(db, userId, id)));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    built += ok;
    if (!ok) {
      console.error("brain batch failed", results.map((r) => r.status === "rejected" && String(r.reason)));
      return { built, remaining };
    }
  }
}

/** Nightly/periodic work for every user: calendar (and beta Gmail) sync, then memories. */
export async function runScheduledJobs(budgetMs: number) {
  const db = createAdminClient();
  const deadline = Date.now() + budgetMs;
  const results: Record<string, unknown>[] = [];

  const { data: google } = await db.from("google_accounts").select("user_id").eq("needs_reconnect", false);
  for (const g of google ?? []) {
    if (Date.now() > deadline - 30_000) break;
    results.push({ user: g.user_id, sync: await syncGoogle(g.user_id) });
  }
  const { data: people } = await db.from("profiles").select("user_id").not("onboarded_at", "is", null);
  for (const p of people ?? []) {
    const left = deadline - Date.now();
    if (left < 90_000) break;
    const memories = await buildBrainsFor(p.user_id, Math.min(left, 120_000));
    // Fresh drafts waiting each morning (after memories, so drafts can use them).
    const drafts = await buildQueue(db, p.user_id).catch((e) => ({ made: 0, error: String(e) }));
    results.push({ user: p.user_id, memories, drafts });
  }
  return results;
}
