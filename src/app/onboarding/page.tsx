import Link from "next/link";
import { Logo } from "@/components/Logo";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { ProfileForm, type ProfileRow } from "@/components/ProfileForm";
import { LinkedInImport } from "../me/LinkedInImport";
import { finishOnboarding } from "../profile-actions";

const STEPS = ["You", "LinkedIn", "Calendar"];

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const sp = await searchParams;
  const step = Math.min(Math.max(Number(sp.step) || 1, 1), 3);
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count }, { data: google }] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle<ProfileRow>(),
    supabase.from("contacts").select("id", { count: "exact", head: true }),
    supabase.from("google_status").select("email").maybeSingle(),
  ]);
  const p: Partial<ProfileRow> = profile ?? { name: (user.user_metadata?.name as string) ?? "" };

  return (
    <div className="space-y-6 pt-4">
      <header>
        <div className="mb-6"><Logo size={22} /></div>
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-accent" : "bg-line"}`} />
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">Step {step} of 3</p>
      </header>

      {step === 1 && (
        <section>
          <h1 className="text-2xl font-semibold tracking-tight">Tell Orbit about you</h1>
          <p className="mt-1 mb-5 text-sm text-muted">This is how Orbit decides who matters for your goals and writes messages in your voice.</p>
          <ProfileForm p={p} next="/onboarding?step=2" submitLabel="Continue" />
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Bring in your LinkedIn network</h1>
          <ol className="list-decimal space-y-1 rounded-lg border border-line bg-card p-4 pl-8 text-sm">
            <li>On LinkedIn, open <b>Settings &amp; Privacy → Data privacy → Get a copy of your data</b>.</li>
            <li>Choose <b>“Download larger data archive”</b> (includes your messages) and request it.</li>
            <li>LinkedIn emails you a link, usually within 10 minutes and sometimes up to a day.</li>
            <li>Download the .zip and upload it below. Nothing is posted to LinkedIn.</li>
          </ol>
          <LinkedInImport />
          <div className="flex gap-2">
            <Link href="/onboarding?step=3" className="flex-1 rounded-md bg-accent py-3 text-center font-medium text-accent-ink">
              {count ? "Continue" : "Skip for now"}
            </Link>
          </div>
          {!count && <p className="text-center text-xs text-muted">You can import anytime from the Me tab once LinkedIn emails your archive.</p>}
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Connect your calendar</h1>
          <p className="text-sm text-muted">
            Optional. Orbit reads your Google Calendar (read-only) to prep you before coffee chats and remind you to
            follow up after. It never creates, changes or deletes events.
          </p>
          {google ? (
            <p className="rounded-lg border border-accent/15 bg-accent-soft p-4 text-sm text-accent">✓ Connected as {google.email}</p>
          ) : (
            <a href="/api/google/connect?next=/onboarding%3Fstep%3D3" className="block rounded-md border border-line bg-card py-3 text-center font-medium">
              Connect Google Calendar
            </a>
          )}
          <form action={finishOnboarding}>
            <button className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink">
              {google ? "Finish" : "Skip and finish"}
            </button>
          </form>
          <p className="text-center text-xs text-muted">Orbit starts writing relationship memories in the background. Your list fills in over the next few minutes.</p>
        </section>
      )}
    </div>
  );
}
