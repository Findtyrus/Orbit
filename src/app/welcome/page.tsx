import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Orbit | The networking CRM for finance and accounting students" };

const FEATURES = [
  {
    title: "A daily list, not a database",
    body: "Each morning Orbit ranks the handful of people worth contacting, with why now, what happened last time, and a drafted message.",
  },
  {
    title: "Every conversation, remembered",
    body: "Import your LinkedIn messages and Orbit keeps a profile of each person: their path, the advice they gave, and what you promised.",
  },
  {
    title: "Follow-ups that don't slip",
    body: "“Send me your resume.” “Reach back out in January.” Orbit catches commitments in your conversations and reminds you.",
  },
  {
    title: "A pipeline for every target firm",
    body: "Track each firm from networking to offer, see who you know there, and get the next move, down to who to ask for a referral.",
  },
  {
    title: "Prepared for every coffee chat",
    body: "Connect Google Calendar for a one-page brief before each chat and a follow-up reminder after it.",
  },
];

function PreviewCard() {
  return (
    <div className="rounded-lg border border-line bg-card p-4 shadow-[0_1px_0_rgba(0,0,0,0.03),0_12px_32px_-12px_rgba(20,23,28,0.18)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Today · 3 to reach</div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-accent-soft text-sm font-semibold text-accent">JM</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">Jordan Mills</span>
            <span className="rounded border border-ink px-1.5 py-px text-[11px] font-medium text-ink">Warm <span className="opacity-60">62</span></span>
          </div>
          <div className="truncate text-sm text-muted">Senior Associate, Transaction Advisory</div>
        </div>
      </div>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-3"><dt className="w-16 shrink-0 text-faint">Why now</dt><dd>Said to reconnect after midterms</dd></div>
        <div className="flex gap-3"><dt className="w-16 shrink-0 text-faint">Next</dt><dd className="font-medium">Share your internship update and ask about FDD timing</dd></div>
      </dl>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm font-medium">
        <span className="rounded-md bg-accent py-1.5 text-accent-ink">Message</span>
        <span className="rounded-md border border-line py-1.5">Snooze</span>
        <span className="rounded-md border border-line py-1.5">View</span>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <div className="space-y-14 pt-4">
      <header className="flex items-center justify-between">
        <Logo size={22} />
        <Link href="/login" className="text-sm font-medium text-muted hover:text-ink">Sign in</Link>
      </header>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">For finance &amp; accounting students</p>
        <h1 className="mt-3 text-[2.6rem] leading-[1.08]">Keep the people in your orbit close.</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">
          Orbit is a networking CRM for students recruiting into audit, transaction advisory, banking, private equity
          and corporate development. It remembers every conversation and tells you who to follow up with and what
          to say.
        </p>
        <div className="mt-7 flex gap-3">
          <Link href="/signup" className="flex-1 rounded-md bg-accent py-3 text-center font-medium text-accent-ink">Start free trial</Link>
          <Link href="/login" className="rounded-md border border-line bg-card px-5 py-3 text-center font-medium">Sign in</Link>
        </div>
        <p className="mt-3 text-xs text-faint">14 days of Pro free · No credit card · Works on your phone</p>
      </section>

      <PreviewCard />

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">What it does</h2>
        <ol className="mt-3 divide-y divide-line border-y border-line">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="flex gap-4 py-4">
              <span className="w-5 shrink-0 text-sm font-medium text-faint tabular-nums">{i + 1}</span>
              <div>
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-line bg-card p-5">
        <h2 className="text-lg font-semibold tracking-tight">Set up in five minutes</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          <li><span className="font-medium text-ink">1.</span> Add your school, target roles and firms.</li>
          <li><span className="font-medium text-ink">2.</span> Upload your LinkedIn data export with your connections and messages.</li>
          <li><span className="font-medium text-ink">3.</span> Optionally connect Google Calendar.</li>
        </ol>
        <p className="mt-4 text-xs text-faint">
          You approve every message. Orbit never sends anything on your behalf. Your data is private to you and can be
          exported or deleted anytime.
        </p>
        <Link href="/signup" className="mt-5 block rounded-md bg-accent py-3 text-center font-medium text-accent-ink">Create your account</Link>
      </section>

      <footer className="flex justify-between border-t border-line pt-5 pb-6 text-xs text-faint">
        <span>© {new Date().getFullYear()} Orbit</span>
        <span className="flex gap-4">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </span>
      </footer>
    </div>
  );
}
