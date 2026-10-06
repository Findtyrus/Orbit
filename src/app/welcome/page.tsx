import Link from "next/link";
import type { ReactNode } from "react";
import { Logo, Mark } from "@/components/Logo";

export const metadata = {
  title: "Orbit | Your career has gravity",
  description:
    "The networking app for finance and accounting students. Orbit remembers every coffee chat, reminds you what you promised, and drafts your follow-ups.",
};

const FEATURES = [
  {
    eyebrow: "Today",
    title: "Know exactly who to talk to today.",
    body: "Every morning Orbit ranks the handful of people worth reaching out to, with why now, what happened last time, and what to do next.",
    points: ["Ranked by relationship strength and timing", "Application deadlines and meetings up top", "Open loops you haven't closed"],
    img: "today.jpg",
    alt: "Orbit's Today screen with people to reach, applications due and meetings",
  },
  {
    eyebrow: "Outreach queue",
    title: "Your follow-ups, already drafted.",
    body: "Orbit writes the follow-up, the check-in and the first intro to someone at a target company. You read it, edit it and send it yourself.",
    points: ["Drafts only. Nothing sends without you", "Opens in your own email or Gmail", "Approve, edit or skip each one"],
    img: "outreach.jpg",
    alt: "Orbit's outreach queue with a drafted follow-up email",
  },
  {
    eyebrow: "Relationship memory",
    title: "Remember every conversation.",
    body: "Import your LinkedIn messages and Orbit keeps a profile of each person: their path, the advice they gave, what you promised, and what you have in common.",
    points: ["Catches promises like “send me your resume”", "Finds shared employers, schools and paths", "A clear next step for every person"],
    img: "person.jpg",
    alt: "A contact's page in Orbit with what you have in common and a relationship summary",
  },
  {
    eyebrow: "Companies",
    title: "Know who you know at every company.",
    body: "Track each company from researching to offer. See who you know there, who you've actually talked to, and when the application is due.",
    points: ["Your recruiting pipeline in one place", "People, conversations and warm contacts per company", "Deadlines you can't miss"],
    img: "companies.jpg",
    alt: "Orbit's Companies pipeline with people and deadlines at each firm",
  },
  {
    eyebrow: "Meeting prep",
    title: "Walk into every coffee chat ready.",
    body: "Connect Google Calendar and get a one page brief before each chat: what to remember, your angle, and questions worth asking. Then a nudge to follow up after.",
    points: ["Briefs built from your history with them", "Questions tailored to their path", "A reminder to capture takeaways after"],
    img: "prep.jpg",
    alt: "A meeting prep brief in Orbit before a coffee chat",
  },
];

const STEPS = [
  ["Tell Orbit what you're recruiting for", "Your school, target roles and the companies you want."],
  ["Import your LinkedIn", "Upload your free LinkedIn data export with your connections and messages."],
  ["Open Today each morning", "Follow up with the right people, with the message already drafted."],
];

const FAQ: [string, string][] = [
  ["Will Orbit message people for me?", "Never. Orbit drafts messages; you read, edit and send every one yourself from LinkedIn or your own email."],
  ["Is my data private?", "Yes. Your network is visible only to you. You can export or delete everything anytime, and the AI provider doesn't train on your data."],
  ["Do I need LinkedIn Premium?", "No. You import your free LinkedIn data export (Settings, Data privacy, Get a copy of your data)."],
  ["LinkedIn's export takes a day. Can I start now?", "Yes. Add the people you're already talking to by hand and set up your target companies while you wait."],
  ["Why not just use a spreadsheet?", "A spreadsheet doesn't remember what people told you, notice when someone hasn't replied, or draft the follow-up. Orbit does all three."],
  ["Is it only for finance and accounting?", "It's built for them first, with target companies, coffee chats and recruiting deadlines. Any student who networks can use it."],
  ["What does it cost?", "Free for 14 days, no credit card. Then $6 a month or $48 a year, which works out to $4 a month."],
  ["Is there an iPhone app?", "Orbit works on your phone today. Open it in Safari, tap Share, then Add to Home Screen, and it opens like an app. Light and dark mode included."],
];

/** A simple phone frame around a real screenshot or video. */
function Phone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[300px] rounded-[44px] bg-[#111] p-[10px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.45)] ring-1 ring-[#2a2a2a] ${className}`}>
      <div className="relative aspect-[750/1560] overflow-hidden rounded-[35px] bg-bg">{children}</div>
    </div>
  );
}

function Screen({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/landing/${src}`} alt={alt} loading="lazy" className="absolute inset-x-0 top-0 w-full" />;
}

function Cta({ className = "", children = "Start free for 14 days" }: { className?: string; children?: ReactNode }) {
  return (
    <Link href="/signup" className={`inline-flex items-center justify-center rounded-md bg-accent px-6 py-3.5 font-medium text-accent-ink transition-opacity hover:opacity-90 ${className}`}>
      {children}
    </Link>
  );
}

const Fine = () => <p className="mt-3 text-xs text-faint">No credit card · Works on your phone · Cancel anytime</p>;

export default function WelcomePage() {
  return (
    // Full width on desktop, breaking out of the app's phone-width column.
    <div className="ml-[calc(50%-50vw)] w-screen">
      <div className="mx-auto max-w-5xl px-5">
        <header className="flex items-center justify-between py-2">
          <Logo size={22} />
          <nav className="flex items-center gap-5 text-sm font-medium">
            <a href="#features" className="hidden text-muted hover:text-ink sm:inline">Features</a>
            <a href="#pricing" className="hidden text-muted hover:text-ink sm:inline">Pricing</a>
            <a href="#faq" className="hidden text-muted hover:text-ink sm:inline">FAQ</a>
            <Link href="/login" className="text-muted hover:text-ink">Sign in</Link>
            <Link href="/signup" className="rounded-md bg-accent px-3 py-1.5 text-accent-ink">Try free</Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="grid items-center gap-12 pt-12 pb-20 md:grid-cols-[1.15fr_1fr] md:pt-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">For finance and accounting students</p>
            <h1 className="mt-4 text-[2.9rem] leading-[1.02] tracking-[-0.04em] md:text-[4.2rem]">Your career has gravity.</h1>
            <p className="mt-5 max-w-lg text-[18px] leading-relaxed text-muted">
              Orbit remembers every coffee chat, reminds you what you promised, and tells you who to follow up with
              today, with the message already drafted. Keep the right people in orbit.
            </p>
            <div className="mt-8">
              <Cta />
              <Fine />
            </div>
          </div>
          <Phone className="max-w-[290px]">
            <video src="/landing/orbit-promo.mp4" poster="/landing/orbit-promo-poster.jpg" autoPlay muted loop playsInline
              className="absolute inset-0 h-full w-full object-cover" aria-label="A 35 second tour of Orbit" />
          </Phone>
        </section>

        {/* The problem */}
        <section className="border-y border-line py-16 text-center">
          <p className="mx-auto max-w-2xl text-[1.9rem] font-semibold leading-tight tracking-[-0.03em] md:text-[2.4rem]">
            Every coffee chat ends with a promise. <span className="text-faint">Most get forgotten.</span>
          </p>
          <p className="mx-auto mt-5 max-w-xl text-muted">
            “Send me your resume.” “Reach back out in January.” The coffee chat doesn&apos;t get you the referral. The
            follow-up does. Orbit makes sure it happens.
          </p>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-6 space-y-24 py-24">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <div className={i % 2 ? "md:order-2" : ""}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">{f.eyebrow}</p>
                <h2 className="mt-3 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em]">{f.title}</h2>
                <p className="mt-4 leading-relaxed text-muted">{f.body}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {f.points.map((p) => (
                    <li key={p} className="flex gap-3"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />{p}</li>
                  ))}
                </ul>
              </div>
              <Phone><Screen src={f.img} alt={f.alt} /></Phone>
            </div>
          ))}

          {/* Light and dark */}
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">On your phone</p>
              <h2 className="mt-3 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em]">Easy on the eyes.</h2>
              <p className="mt-4 leading-relaxed text-muted">
                Add Orbit to your home screen from Safari and it opens like an app. Light, dark, or match your phone.
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Phone className="max-w-[220px]"><Screen src="companies.jpg" alt="Orbit in light mode" /></Phone>
              <Phone className="max-w-[220px] translate-y-8"><Screen src="companies-dark.jpg" alt="Orbit in dark mode" /></Phone>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-2xl border border-line bg-card p-8 md:p-12">
          <h2 className="text-[1.7rem] font-semibold tracking-[-0.03em]">Set up in five minutes.</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map(([t, b], i) => (
              <li key={t}>
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong text-sm font-semibold">{i + 1}</span>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{b}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Trust */}
        <section className="grid gap-8 py-20 text-center md:grid-cols-3">
          {[
            ["You send every message", "Orbit drafts. You read, edit and hit send. Nothing goes out on its own."],
            ["Private to you", "Your network is only visible to you. The AI provider doesn't train on your data."],
            ["Yours to keep", "Export or delete everything, anytime, from your account."],
          ].map(([t, b]) => (
            <div key={t}>
              <h3 className="font-semibold">{t}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-6 border-t border-line py-20">
          <h2 className="text-center text-[2rem] font-semibold tracking-[-0.035em]">Less than one coffee a month.</h2>
          <div className="mx-auto mt-10 grid max-w-3xl gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-card p-7">
              <h3 className="font-semibold">Free trial</h3>
              <p className="mt-3 text-4xl font-semibold tracking-tight">$0</p>
              <p className="mt-1 text-sm text-muted">for 14 days, no credit card</p>
              <ul className="mt-6 space-y-2 text-sm text-muted">
                <li>Everything in Orbit</li><li>A taste of the AI: memories, drafts and prep</li><li>Keep your data if you don&apos;t upgrade</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-ink bg-card p-7">
              <h3 className="font-semibold">Pro</h3>
              <p className="mt-3 text-4xl font-semibold tracking-tight">$6<span className="text-base font-normal text-muted"> /month</span></p>
              <p className="mt-1 text-sm text-muted">or $48 a year, $4 a month</p>
              <ul className="mt-6 space-y-2 text-sm text-muted">
                <li>Memories for up to 200 people</li><li>Daily drafted outreach and meeting prep</li><li>Ask your network anything</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 text-center"><Cta /><Fine /></div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-2xl scroll-mt-6 pb-24">
          <h2 className="text-[2rem] font-semibold tracking-[-0.035em]">Questions</h2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-xl leading-none text-faint transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {/* Closing call to action, always dark like the end of the video. */}
      <section className="relative overflow-hidden bg-[#0a0a0a] px-5 py-24 text-center text-[#ededed]">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60"
          style={{ backgroundImage: "radial-gradient(1.5px 1.5px at 12% 22%, #fff5 50%, transparent 51%), radial-gradient(1.5px 1.5px at 78% 14%, #fff4 50%, transparent 51%), radial-gradient(2px 2px at 64% 68%, #fff3 50%, transparent 51%), radial-gradient(1.5px 1.5px at 30% 80%, #fff4 50%, transparent 51%), radial-gradient(1.5px 1.5px at 90% 58%, #fff5 50%, transparent 51%), radial-gradient(2px 2px at 46% 36%, #fff2 50%, transparent 51%), radial-gradient(1.5px 1.5px at 6% 62%, #fff3 50%, transparent 51%)" }} />
        <div className="relative">
          <Mark size={56} className="mx-auto" />
          <h2 className="mt-8 text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[3.2rem]">Keep the right people in orbit.</h2>
          <p className="mx-auto mt-4 max-w-md text-[#a3a3a3]">Built by an accounting student, for students recruiting in finance and accounting.</p>
          <Link href="/signup" className="mt-9 inline-flex rounded-md bg-[#ededed] px-7 py-3.5 font-medium text-[#0a0a0a] hover:opacity-90">Start free for 14 days</Link>
          <p className="mt-3 text-xs text-[#737373]">No credit card · Works on your phone · Cancel anytime</p>
        </div>
      </section>

      <footer className="mx-auto flex max-w-5xl justify-between px-5 pt-6 text-xs text-faint">
        <span>© {new Date().getFullYear()} Orbit</span>
        <span className="flex gap-4">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </span>
      </footer>
    </div>
  );
}
