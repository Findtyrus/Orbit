"use client";

import { useState, useTransition } from "react";
import { finishTour } from "@/app/profile-actions";
import { Mark } from "./Logo";

const STEPS = [
  {
    title: "Welcome to Orbit",
    body: "Orbit keeps your recruiting relationships moving. It remembers every conversation and tells you who to follow up with, and what to say.",
    where: null,
  },
  {
    title: "Today",
    body: "Each morning you get a short, ranked list of people worth contacting, with why now, what happened last time, and a drafted message. Tap Message to copy it and open LinkedIn or email. You always send it yourself.",
    where: "Today tab",
  },
  {
    title: "People",
    body: "Everyone in your network. Open anyone to see their relationship memory: their career path, advice they gave you, and open loops like \"send resume\". After a coffee chat, write a few lines in How did it go and Orbit updates everything.",
    where: "People tab",
  },
  {
    title: "Relationship strength",
    body: "Every person gets a score from 0 to 100 based on how often you talk, whether they reply, recency, and meetings. Strong and Warm are your real relationships. New means you're connected but haven't talked yet.",
    where: "Badges on each person",
  },
  {
    title: "Companies",
    body: "Add the companies you're recruiting for. Orbit finds everyone you know there and tracks each one from networking to offer, with a suggested next move.",
    where: "Companies tab",
  },
  {
    title: "Calendar",
    body: "Coffee chats, follow-ups, things you promised, and application deadlines in one place. Connect Google Calendar to get a prep brief before each chat.",
    where: "Calendar tab",
  },
  {
    title: "Get set up",
    body: "In Account, import your LinkedIn data and connect Google Calendar. You can replay this walkthrough there anytime.",
    where: "Account tab",
  },
];

export function Tour() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(true);
  const [, start] = useTransition();
  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const close = () => { setOpen(false); start(() => finishTour()); };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      role="dialog" aria-modal="true" aria-label="Orbit walkthrough">
      <div className="w-full max-w-md rounded-xl border border-line bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <Mark size={22} className="text-ink" />
          <button type="button" onClick={close} className="text-sm text-muted hover:text-ink">Skip tour</button>
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">{s.title}</h2>
        {s.where && <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{s.where}</p>}
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{s.body}</p>
        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-ink" : "w-1.5 bg-line-strong"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="rounded-md border border-line px-4 py-2 text-sm font-medium">Back</button>
            )}
            <button type="button" onClick={() => (last ? close() : setStep(step + 1))}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink">
              {last ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
