"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlan } from "@/lib/billing";
import { PRICE_KEYS, stripe, type Interval } from "@/lib/stripe";

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

/** The user's Stripe customer, created on first checkout and remembered. */
async function customerFor(user: { id: string; email?: string }) {
  const db = createAdminClient();
  const { data } = await db.from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id;
  const customer = await stripe().customers.create({ email: user.email, metadata: { user_id: user.id } });
  await db.from("subscriptions").upsert({ user_id: user.id, stripe_customer_id: customer.id });
  return customer.id;
}

export async function startCheckout(interval: Interval) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const plan = await getPlan(supabase, user);
  if (plan.source === "subscription") redirect("/me");

  const prices = await stripe().prices.list({ lookup_keys: [PRICE_KEYS[interval]], active: true, limit: 1 });
  if (!prices.data[0]) throw new Error("Stripe prices not found. Run `npm run stripe:setup` first.");

  // Subscribing mid-trial keeps the rest of the free trial: Stripe won't charge until it ends
  // (Stripe requires a trial end at least 48 hours away).
  const trialEnd = plan.trialEndsAt.getTime() - Date.now() > 48 * 3_600_000
    ? Math.floor(plan.trialEndsAt.getTime() / 1000) : undefined;

  const base = await origin();
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await customerFor(user),
    client_reference_id: user.id,
    line_items: [{ price: prices.data[0].id, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id }, ...(trialEnd ? { trial_end: trialEnd } : {}) },
    allow_promotion_codes: true,
    success_url: `${base}/me?billing=success`,
    cancel_url: `${base}/upgrade`,
  });
  redirect(session.url!);
}

export async function openBillingPortal() {
  const { user } = await getUser();
  if (!user) redirect("/login");
  const session = await stripe().billingPortal.sessions.create({
    customer: await customerFor(user),
    return_url: `${await origin()}/me?billing=portal`,
  });
  redirect(session.url);
}
