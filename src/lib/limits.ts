import "server-only";
import { createAdminClient } from "./supabase/admin";
import { getPlanById, PLAN_LIMITS, type UsageKind } from "./billing";

export type { UsageKind };

/** Reserve `n` units of today's allowance for the user's plan. Returns false when they're over the cap. */
export async function spendAI(userId: string, kind: UsageKind, n = 1): Promise<boolean> {
  const plan = await getPlanById(userId);
  const { data, error } = await createAdminClient().rpc("spend_ai", {
    p_user: userId, p_kind: kind, p_cap: PLAN_LIMITS[plan.tier][kind], p_n: n,
  });
  if (error) throw new Error(`Usage check failed: ${error.message}`);
  return data === true;
}

const LABEL: Record<UsageKind, string> = { memories: "memory updates", asks: "questions", preps: "meeting briefs", drafts: "outreach drafts" };

export const limitMessage = (kind: UsageKind) =>
  `You've used today's ${LABEL[kind]}. It resets at midnight UTC, or upgrade to Orbit Pro for more.`;
