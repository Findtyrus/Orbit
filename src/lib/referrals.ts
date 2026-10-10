import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "./supabase/admin";
import { stripe } from "./stripe";
import { PRICES } from "./billing";

export const FRIEND_DAYS = 7;   // extra trial days for the friend who joins
export const REFERRER_DAYS = 30; // extra days for the student who invited them
export const MAX_REWARDS = 6;    // rewarded invites that count per student

/** A student's invite code, created the first time it's needed. */
export async function codeFor(userId: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
  if (data?.code) return data.code;
  for (let i = 0; i < 5; i++) {
    const code = randomBytes(5).toString("hex").slice(0, 8);
    const { error } = await db.from("referral_codes").insert({ user_id: userId, code });
    if (!error) return code;
    const { data: again } = await db.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
    if (again?.code) return again.code;
  }
  throw new Error("Could not create an invite code");
}

/** Extra trial days earned: joining through an invite, plus each friend who got going. */
export async function bonusDays(userId: string): Promise<number> {
  if (!process.env.SUPABASE_SECRET_KEY) return 0;
  const db = createAdminClient();
  const [{ count: joined }, { count: rewarded }] = await Promise.all([
    db.from("referrals").select("id", { count: "exact", head: true }).eq("referred_id", userId),
    db.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId).not("rewarded_at", "is", null),
  ]);
  return (joined ? FRIEND_DAYS : 0) + Math.min(rewarded ?? 0, MAX_REWARDS) * REFERRER_DAYS;
}

export async function referralStats(userId: string) {
  const db = createAdminClient();
  const [{ count: invited }, { count: rewarded }] = await Promise.all([
    db.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId),
    db.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", userId).not("rewarded_at", "is", null),
  ]);
  return { invited: invited ?? 0, rewarded: rewarded ?? 0 };
}

/** Called once, when a new account is created: links it to whoever invited them (code from the orbit_ref cookie). */
export async function claimInvite(userId: string) {
  try {
    const code = (await cookies()).get("orbit_ref")?.value;
    if (!code || !/^[a-z0-9]{6,12}$/.test(code)) return;
    const db = createAdminClient();
    const { data: owner } = await db.from("referral_codes").select("user_id").eq("code", code).maybeSingle();
    if (!owner || owner.user_id === userId) return;
    await db.from("referrals").upsert({ referrer_id: owner.user_id, referred_id: userId }, { onConflict: "referred_id", ignoreDuplicates: true });
  } catch (e) {
    console.error("claimInvite failed", e);
  }
}

/** When the invited friend imports LinkedIn: reward the inviter. Paying inviters get $6 off their next bill. */
export async function rewardInvite(friendId: string) {
  try {
    const db = createAdminClient();
    const { data: row } = await db.from("referrals").select("id, referrer_id").eq("referred_id", friendId).is("rewarded_at", null).maybeSingle();
    if (!row) return;
    const { count } = await db.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", row.referrer_id).not("rewarded_at", "is", null);
    if ((count ?? 0) >= MAX_REWARDS) return;
    await db.from("referrals").update({ rewarded_at: new Date().toISOString() }).eq("id", row.id);
    const { data: sub } = await db.from("subscriptions").select("status, stripe_customer_id").eq("user_id", row.referrer_id).maybeSingle();
    if (sub?.stripe_customer_id && (sub.status === "active" || sub.status === "trialing") && process.env.STRIPE_SECRET_KEY) {
      await stripe().customers.createBalanceTransaction(sub.stripe_customer_id, {
        amount: -PRICES.month * 100, currency: "usd", description: "Orbit invite reward: one free month",
      });
    }
  } catch (e) {
    console.error("rewardInvite failed", e);
  }
}
