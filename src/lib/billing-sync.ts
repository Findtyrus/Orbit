import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "./supabase/admin";
import { stripe } from "./stripe";

/** Upsert a Stripe subscription into public.subscriptions (called by the webhook and after checkout). */
export async function saveSubscription(sub: Stripe.Subscription) {
  const db = createAdminClient();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let userId = sub.metadata?.user_id;
  if (!userId) {
    const { data } = await db.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) {
    console.error("stripe webhook: no user for customer", customerId);
    return;
  }
  const item = sub.items.data[0];
  const { error } = await db.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    price_id: item?.price.id ?? null,
    plan_interval: item?.price.recurring?.interval ?? null,
    current_period_end: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message); // non-2xx makes Stripe retry
}

/**
 * Pull the latest subscription for this user straight from Stripe. Used when they return from checkout or the
 * billing portal, so access updates immediately even before (or without) a webhook arriving.
 */
export async function refreshFromStripe(userId: string) {
  const db = createAdminClient();
  const { data } = await db.from("subscriptions").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (!data?.stripe_customer_id) return;
  const subs = await stripe().subscriptions.list({ customer: data.stripe_customer_id, status: "all", limit: 1 });
  if (subs.data[0]) await saveSubscription(subs.data[0]);
}
