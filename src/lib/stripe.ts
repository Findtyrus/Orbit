import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set in .env.local");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/** Prices are found by lookup key (created by `npm run stripe:setup`), so no price IDs live in config. */
export const PRICE_KEYS = { month: "orbit_pro_monthly", year: "orbit_pro_yearly" } as const;
export type Interval = keyof typeof PRICE_KEYS;
