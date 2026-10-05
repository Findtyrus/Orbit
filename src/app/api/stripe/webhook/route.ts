import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { saveSubscription } from "@/lib/billing-sync";

/** Keeps public.subscriptions in sync with Stripe. Configure in Stripe → Developers → Webhooks. */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  let sub: Stripe.Subscription | null = null;
  if (event.type === "checkout.session.completed") {
    const s = event.data.object;
    if (s.mode === "subscription" && typeof s.subscription === "string") {
      sub = await stripe().subscriptions.retrieve(s.subscription);
    }
  } else if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    sub = event.data.object;
  }
  if (sub) await saveSubscription(sub);
  return NextResponse.json({ received: true });
}
