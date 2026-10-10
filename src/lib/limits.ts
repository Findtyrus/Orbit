import "server-only";
import { createAdminClient } from "./supabase/admin";
import { bonusDays } from "./referrals";
import { MONTHLY_AI_BUDGET, planFrom, PLAN_LIMITS, UNIT_COST, type UsageKind } from "./billing";

export type { UsageKind };

export type AIAccess = { active: boolean; tier?: "pro" | "trial"; reason?: "off" | "needs_pro" };

const allowlisted = (email: string | undefined) =>
  !!email && (process.env.AI_ALLOWED_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).includes(email.toLowerCase());

/**
 * Who can use AI (every AI call goes through here, so nothing bypasses it):
 * paying subscribers and accounts in AI_ALLOWED_EMAILS (full limits), and trial accounts (small limits,
 * unless AI_IN_TRIAL=false).
 * Anyone can also switch AI off for their own account.
 */
export async function aiAccess(userId: string): Promise<AIAccess> {
  const db = createAdminClient();
  const [{ data: u }, { data: sub }, { data: prof }] = await Promise.all([
    db.auth.admin.getUserById(userId),
    db.from("subscriptions").select("status, plan_interval, current_period_end, cancel_at_period_end, stripe_customer_id")
      .eq("user_id", userId).maybeSingle(),
    db.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (prof && prof.ai_enabled === false) return { active: false, reason: "off" };
  if (allowlisted(u.user?.email)) return { active: true, tier: "pro" };
  const plan = planFrom(u.user?.created_at ?? new Date(0).toISOString(), sub, await bonusDays(userId));
  if (plan.source === "subscription") return { active: true, tier: "pro" };
  // Trials get a limited taste of AI unless AI_IN_TRIAL=false.
  if (plan.source === "trial" && process.env.AI_IN_TRIAL !== "false") return { active: true, tier: "trial" };
  return { active: false, reason: "needs_pro" };
}

const LABEL: Record<UsageKind, string> = { memories: "memory updates", asks: "questions", preps: "meeting briefs", drafts: "outreach drafts" };

export const accessMessage = (a: AIAccess) =>
  a.reason === "off"
    ? "AI is turned off for your account. You can turn it back on in Account."
    : "AI features are part of Orbit Pro. Everything else works without it.";

export const limitMessage = (kind: UsageKind) =>
  `You've used today's ${LABEL[kind]}. It resets at midnight UTC.`;

/**
 * Gate for every AI call: checks access, then reserves `n` units of today's allowance.
 * Returns null when the call may proceed, or a message explaining why not.
 */
export async function claimAI(userId: string, kind: UsageKind, n = 1): Promise<string | null> {
  const access = await aiAccess(userId);
  if (!access.active) return accessMessage(access);
  const tier = access.tier ?? "pro";
  const { data, error } = await createAdminClient().rpc("spend_ai2", {
    p_user: userId, p_kind: kind, p_cap: PLAN_LIMITS[tier][kind], p_n: n,
    p_cost: UNIT_COST[kind] * n, p_month_cap: MONTHLY_AI_BUDGET[tier],
  });
  if (error) throw new Error(`Usage check failed: ${error.message}`);
  if (data === "ok") return null;
  if (data === "month") {
    return tier === "trial"
      ? "You've used the AI included in your free trial. Upgrade to Pro to keep going."
      : "You've used this month's AI allowance. It resets on the 1st. Everything else in Orbit keeps working.";
  }
  return tier === "trial"
    ? `You've used today's trial ${LABEL[kind]}. Upgrade to Pro for more, or come back tomorrow.`
    : limitMessage(kind);
}
