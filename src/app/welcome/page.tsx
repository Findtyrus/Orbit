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
    title: "A pipeline for every target company",
    body: "Track each company from networking to offer, see who you know there, and get the next move, down to who to ask for a referral.",
  },
  {
    title: "Prepared for every coffee chat",
    body: "Connect Google Calendar for a one-page brief before each chat and a follow-up reminder after it.",
  },
];

const FAQ: [string, string][] = [
  ["Will Orbit message people for me?", "Never. Orbit drafts messages; you read, edit and send every one yourself from LinkedIn or your own email."],
  ["Is my data private?", "Yes. Your network is visible only to you. You can export or delete everything anytime, and the AI provider doesn't train on your data."],
  ["Do I need LinkedIn Premium?", "No. You import your free LinkedIn data export (Settings, Data privacy, Get a copy of your data)."],
  ["LinkedIn's export takes a day. Can I start now?", "Yes. Add the people you're already talking to by hand and set up your target companies while you wait."],
  ["Why not just use a spreadsheet?", "A spreadsheet doesn't remember what people told you, notice when someone hasn't replied, or draft the follow-up. Orbit does all three."],
  ["Is it only for finance and accounting?", "It's built for them first, with target companies, coffee chats and recruiting deadlines. Any student who networks can use it."],
  ["What does it cost?", "Free for 14 days, no credit card. Then $6 a month or $48 a year, which works out to about $4 a month."],
  ["Is there an iPhone app?", "Orbit works on your phone today. Open it in Safari, tap Share, then Add to Home Screen, and it opens like an app."],
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
        <h1 className="mt-3 text-[2.6rem] leading-[1.08]">Turn coffee chats into referrals.</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted">
          Orbit remembers every networking conversation, reminds you what you promised, and tells you exactly who to
          follow up with today, with the message already drafted. Built for students recruiting into audit,
          advisory, banking and corporate finance.
        </p>
        <Link href="/signup" className="mt-7 block rounded-md bg-accent py-3.5 text-center font-medium text-accent-ink">Start free trial</Link>
        <p className="mt-3 text-center text-xs text-faint">14 days free · No credit card · Works on your phone</p>
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

      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Questions</h2>
        <div className="mt-3 divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <span className="text-faint transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-card p-5">
        <p className="text-sm text-muted">Keep the people in your orbit close.</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Set up in five minutes</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          <li><span className="font-medium text-ink">1.</span> Add your school, target roles and companies.</li>
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
