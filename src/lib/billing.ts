import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";

export const TRIAL_DAYS = 14;
export const PRICES = { month: 6, year: 48 } as const; // keep in sync with scripts/stripe-setup.mjs

const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);

/** Daily AI allowance per plan. Free keeps Orbit useful between recruiting seasons; Pro is for active recruiting. */
export const PLAN_LIMITS = {
  pro: {
    memories: num(process.env.DAILY_MEMORY_LIMIT, 200),
    asks: num(process.env.DAILY_ASK_LIMIT, 25),
    preps: num(process.env.DAILY_PREP_LIMIT, 15),
    drafts: num(process.env.DAILY_DRAFT_LIMIT, 10),
  },
  free: { memories: 10, asks: 3, preps: 2, drafts: 3 },
};
export const FREE_FIRM_LIMIT = 3;
export type UsageKind = keyof typeof PLAN_LIMITS.pro;

export type Plan = {
  tier: "pro" | "free";
  source: "subscription" | "trial" | "none";
  trialEndsAt: Date;
  trialDaysLeft: number;
  status: string | null;
  interval: string | null;
  renewsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
};

const PAID = new Set(["active", "trialing", "past_due"]); // past_due keeps access while Stripe retries the card

export function planFrom(createdAt: string, sub: {
  status: string | null; plan_interval: string | null; current_period_end: string | null;
  cancel_at_period_end: boolean; stripe_customer_id: string | null;
} | null): Plan {
  const trialEndsAt = new Date(Date.parse(createdAt) + TRIAL_DAYS * 86_400_000);
  const trialDaysLeft = Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000));
  const subscribed = !!sub?.status && PAID.has(sub.status);
  return {
    tier: subscribed || trialDaysLeft > 0 ? "pro" : "free",
    source: subscribed ? "subscription" : trialDaysLeft > 0 ? "trial" : "none",
    trialEndsAt,
    trialDaysLeft,
    status: sub?.status ?? null,
    interval: sub?.plan_interval ?? null,
    renewsAt: sub?.current_period_end ? new Date(sub.current_period_end) : null,
    cancelAtPeriodEnd: !!sub?.cancel_at_period_end,
    hasCustomer: !!sub?.stripe_customer_id,
  };
}

/** Plan for the signed-in user (reads their own subscription row through RLS). */
export async function getPlan(db: SupabaseClient, user: { id: string; created_at: string }): Promise<Plan> {
  const { data } = await db.from("subscriptions")
    .select("status, plan_interval, current_period_end, cancel_at_period_end, stripe_customer_id")
    .eq("user_id", user.id).maybeSingle();
  return planFrom(user.created_at, data);
}

/** Plan for any user id — used by background jobs and usage limits. */
export async function getPlanById(userId: string): Promise<Plan> {
  const db = createAdminClient();
  const [{ data: u }, { data: sub }] = await Promise.all([
    db.auth.admin.getUserById(userId),
    db.from("subscriptions")
      .select("status, plan_interval, current_period_end, cancel_at_period_end, stripe_customer_id")
      .eq("user_id", userId).maybeSingle(),
  ]);
  return planFrom(u.user?.created_at ?? new Date(0).toISOString(), sub);
}
