import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { FREE_FIRM_LIMIT, getPlan, PLAN_LIMITS, PRICES } from "@/lib/billing";
import { openBillingPortal, startCheckout } from "../billing-actions";

const FEATURES: [string, string, string][] = [
  ["People, timelines & Today list", "✓", "✓"],
  ["LinkedIn import & Google Calendar", "✓", "✓"],
  ["Target companies in your pipeline", `${FREE_FIRM_LIMIT}`, "Unlimited"],
  ["AI memory updates per day", `${PLAN_LIMITS.free.memories}`, `${PLAN_LIMITS.pro.memories}`],
  ["Ask your network per day", `${PLAN_LIMITS.free.asks}`, `${PLAN_LIMITS.pro.asks}`],
  ["Meeting prep briefs per day", `${PLAN_LIMITS.free.preps}`, `${PLAN_LIMITS.pro.preps}`],
];

export default async function UpgradePage() {
  const { supabase, user } = await getUser();
  const plan = await getPlan(supabase, user!);
  const subscribed = plan.source === "subscription";

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <Link href="/me" className="text-sm text-muted">← Account</Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Orbit Pro</h1>
        <p className="mt-1 text-muted">Everything you need for recruiting season.</p>
        {plan.source === "trial" && (
          <p className="mt-3 rounded-lg border border-accent/15 bg-accent-soft p-3 text-sm text-accent">
            Your free Pro trial has {plan.trialDaysLeft} day{plan.trialDaysLeft === 1 ? "" : "s"} left. Subscribe now and
            you won&apos;t be charged until it ends.
          </p>
        )}
        {plan.tier === "free" && (
          <p className="mt-3 rounded-lg border border-warn/25 bg-warn-soft p-3 text-sm text-warn">Your trial has ended. You&apos;re on the Free plan.</p>
        )}
      </header>

      <table className="w-full overflow-hidden rounded-lg border border-line bg-card text-sm">
        <thead>
          <tr className="text-left text-muted">
            <th className="p-3 font-medium"></th>
            <th className="p-3 text-center font-medium">Free</th>
            <th className="p-3 text-center font-semibold text-accent">Pro</th>
          </tr>
        </thead>
        <tbody>
          {FEATURES.map(([label, free, pro]) => (
            <tr key={label} className="border-t border-line">
              <td className="p-3">{label}</td>
              <td className="p-3 text-center text-muted">{free}</td>
              <td className="p-3 text-center font-medium">{pro}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {subscribed ? (
        <form action={openBillingPortal}>
          <p className="mb-3 text-center text-sm">You&apos;re on Pro ({plan.interval === "year" ? "yearly" : "monthly"}).</p>
          <button className="w-full rounded-md border border-line bg-card py-3 font-medium">Manage subscription</button>
        </form>
      ) : (
        <div className="space-y-3">
          <form action={startCheckout.bind(null, "year")}>
            <button className="relative w-full rounded-lg bg-accent p-4 text-left text-accent-ink">
              <span className="absolute right-4 top-4 rounded border border-accent-ink/30 px-1.5 py-px text-[11px] font-medium">Save 33%</span>
              <div className="font-semibold">${PRICES.year} / year</div>
              <div className="text-sm opacity-90">${(PRICES.year / 12).toFixed(2)}/mo, covers a full recruiting cycle</div>
            </button>
          </form>
          <form action={startCheckout.bind(null, "month")}>
            <button className="w-full rounded-lg border border-line bg-card p-4 text-left">
              <div className="font-semibold">${PRICES.month} / month</div>
              <div className="text-sm text-muted">Cancel anytime</div>
            </button>
          </form>
          <p className="text-center text-xs text-muted">Secure checkout by Stripe. Have a promo code? Enter it at checkout.</p>
        </div>
      )}
    </div>
  );
}
