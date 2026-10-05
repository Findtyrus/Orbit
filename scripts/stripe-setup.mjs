#!/usr/bin/env node
// One-time: create the "Orbit Pro" product and its prices in your Stripe account (safe to re-run).
//   npm run stripe:setup
// Uses STRIPE_SECRET_KEY from .env.local — run once with your test key, and again with your live key at launch.
import Stripe from "stripe";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

process.loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"));
const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("Set STRIPE_SECRET_KEY in .env.local first");
const stripe = new Stripe(key);

const PRICES = [
  { lookup_key: "orbit_pro_monthly", unit_amount: 600, interval: "month", nickname: "Pro monthly" },
  { lookup_key: "orbit_pro_yearly", unit_amount: 4800, interval: "year", nickname: "Pro yearly" },
];

const existing = await stripe.prices.list({ lookup_keys: PRICES.map((p) => p.lookup_key), limit: 10 });
let productId = existing.data[0] && (typeof existing.data[0].product === "string" ? existing.data[0].product : existing.data[0].product.id);
if (!productId) {
  const product = await stripe.products.create({
    name: "Orbit Pro",
    description: "Unlimited relationship memories, meeting prep and Ask your network.",
  });
  productId = product.id;
}
for (const p of PRICES) {
  if (existing.data.some((e) => e.lookup_key === p.lookup_key)) { console.log(`✓ ${p.lookup_key} already exists`); continue; }
  await stripe.prices.create({
    product: productId, currency: "usd", unit_amount: p.unit_amount, nickname: p.nickname,
    recurring: { interval: p.interval }, lookup_key: p.lookup_key,
  });
  console.log(`+ created ${p.lookup_key} ($${p.unit_amount / 100}/${p.interval})`);
}
console.log(`Done (${key.startsWith("sk_live") ? "LIVE" : "test"} mode).`);
