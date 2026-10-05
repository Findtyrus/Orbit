import Link from "next/link";
import { getUser } from "@/lib/supabase/server";
import { BrainBuilder } from "@/components/client";
import { ProfileForm, type ProfileRow } from "@/components/ProfileForm";
import { getPlan, PLAN_LIMITS } from "@/lib/billing";
import { openBillingPortal } from "../billing-actions";
import { refreshFromStripe } from "@/lib/billing-sync";
import { gmailAllowed } from "@/lib/google";
import { signOut } from "../login/actions";
import { LinkedInImport } from "./LinkedInImport";
import { GoogleSync } from "./GoogleSync";
import { DeleteAccount } from "./DeleteAccount";
import { ResumeUpload } from "./ResumeUpload";
import { ThemePicker } from "@/components/ThemePicker";
import { replayTour } from "../profile-actions";
import { cookies } from "next/headers";

export default async function MePage({ searchParams }: PageProps<"/me">) {
  const sp = await searchParams;
  const flash = sp.google;
  const { supabase, user } = await getUser();
  const [{ data: profile }, { data: google }, { data: usage }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle<ProfileRow>(),
    supabase.from("google_status").select("*").maybeSingle(),
    supabase.from("ai_usage").select("memories, asks, preps").eq("day", new Date().toISOString().slice(0, 10)).maybeSingle(),
  ]);
  // Back from Stripe checkout or the billing portal: sync now rather than waiting on the webhook.
  if (sp.billing && process.env.STRIPE_SECRET_KEY) {
    try { await refreshFromStripe(user!.id); } catch (e) { console.error("stripe refresh failed", e); }
  }
  const plan = await getPlan(supabase, user!);
  const themePref = (await cookies()).get("theme")?.value;
  const limits = PLAN_LIMITS[plan.tier];
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.SUPABASE_SECRET_KEY);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>

      {sp.billing === "success" && (
        <p className="rounded-lg border border-accent/15 bg-accent-soft p-4 text-sm text-accent">Welcome to Orbit Pro! Thanks for supporting Orbit.</p>
      )}

      <section className="rounded-lg border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Plan: {plan.tier === "pro" ? "Pro" : "Free"}</h2>
            <p className="text-sm text-muted">
              {plan.source === "subscription"
                ? plan.cancelAtPeriodEnd
                  ? `Cancels ${plan.renewsAt?.toLocaleDateString() ?? "at period end"}`
                  : plan.status === "trialing"
                    ? `Trial, first charge ${plan.trialEndsAt.toLocaleDateString()}`
                    : `Renews ${plan.renewsAt?.toLocaleDateString() ?? ""}`
                : plan.source === "trial"
                  ? `Free trial: ${plan.trialDaysLeft} day${plan.trialDaysLeft === 1 ? "" : "s"} left`
                  : "Upgrade for AI features and unlimited companies"}
            </p>
          </div>
          {plan.source === "subscription" ? (
            <form action={openBillingPortal}><button className="rounded-md border border-line bg-card px-4 py-2 text-sm font-medium">Manage</button></form>
          ) : (
            <Link href="/upgrade" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink">Upgrade</Link>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="mb-3 font-semibold">Your profile</h2>
        <ProfileForm p={profile ?? {}} />
      </section>

      <ResumeUpload saved={(profile as { resume?: Parameters<typeof ResumeUpload>[0]["saved"] } | null)?.resume ?? null}
        updated={(profile as { resume_updated_at?: string | null } | null)?.resume_updated_at ?? null} />

      <section className="rounded-lg border border-line bg-card p-4">
        <h2 className="font-semibold">Relationship memories</h2>
        <p className="mt-1 text-sm text-muted">
          Orbit writes these automatically after imports and every night. Run it now to catch up immediately.
        </p>
        <div className="mt-3"><BrainBuilder /></div>
        <p className="mt-2 text-xs text-muted">
          Today: {usage?.memories ?? 0}/{limits.memories} memories · {usage?.asks ?? 0}/{limits.asks} questions · {usage?.preps ?? 0}/{limits.preps} meeting briefs
        </p>
      </section>

      <GoogleSync status={google} flash={typeof flash === "string" ? flash : undefined}
        configured={googleConfigured} gmail={gmailAllowed(user?.email)} />

      <LinkedInImport />

      <section className="space-y-3 rounded-lg border border-line bg-card p-4">
        <h2 className="font-semibold">Appearance</h2>
        <ThemePicker initial={themePref === "light" || themePref === "dark" ? themePref : "system"} />
        <form action={replayTour}>
          <button className="text-sm font-medium text-ink underline decoration-line-strong underline-offset-2">Replay the walkthrough</button>
        </form>
      </section>

      <section className="space-y-3 rounded-lg border border-line bg-card p-4 text-sm">
        <h2 className="font-semibold">Account</h2>
        <p className="text-muted">Signed in as {user?.email}</p>
        <a href="/api/account/export" className="block font-medium text-accent">Download my data (JSON)</a>
        <div className="flex gap-4 text-muted">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <form action={signOut}><button className="font-medium">Sign out</button></form>
        <DeleteAccount />
      </section>
    </div>
  );
}
