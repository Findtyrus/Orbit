"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildBrains, refreshBrain, setLoopStatus, type BatchResult } from "@/app/brain-actions";
import { prepMeeting } from "@/app/google-actions";

/** Copies the drafted message, then opens LinkedIn (or email) so you paste, edit and send it yourself. */
export function MessageButton({ message, linkedinUrl, email, className = "" }: {
  message: string | null; linkedinUrl: string | null; email: string | null; className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function go() {
    if (message) {
      try { await navigator.clipboard.writeText(message); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
    }
    if (email && !linkedinUrl) {
      window.location.href = `mailto:${email}${message ? `?body=${encodeURIComponent(message)}` : ""}`;
    } else if (linkedinUrl) {
      window.open(linkedinUrl, "_blank");
    }
  }
  return (
    <button type="button" onClick={go} className={className}>
      {copied ? "Copied ✓" : "Message"}
    </button>
  );
}

export function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="text-sm font-medium text-accent"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} }}>
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

export function RefreshBrainButton({ contactId, label = "Refresh memory" }: { contactId: string; label?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="text-right">
      <button type="button" disabled={pending} className="text-sm font-medium text-accent disabled:opacity-50"
        onClick={() => start(async () => setError(await refreshBrain(contactId)))}>
        {pending ? "Thinking…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-warn">{error}</p>}
    </div>
  );
}

export function LoopCheck({ id, text, due, owner, name }: { id: string; text: string; due: string | null; owner: string; name?: string }) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const overdue = due && due < new Date().toISOString().slice(0, 10);
  return (
    <li className={`flex items-start gap-3 py-2 ${pending ? "opacity-50" : ""}`}>
      <button type="button" aria-label="Mark done" disabled={pending}
        onClick={() => start(async () => { await setLoopStatus(id, "done"); setGone(true); })}
        className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-line" />
      <div className="min-w-0 flex-1 text-sm">
        <div>{text}</div>
        <div className="text-xs text-muted">
          {name && <span>{name} · </span>}
          {owner === "them" ? "they owe this" : "you owe this"}
          {due && <span className={overdue ? "text-warn" : ""}> · due {due}</span>}
        </div>
      </div>
      <button type="button" aria-label="Dismiss" disabled={pending} className="text-xs text-muted"
        onClick={() => start(async () => { await setLoopStatus(id, "dismissed"); setGone(true); })}>✕</button>
    </li>
  );
}

export function BrainBuilder() {
  const [running, setRunning] = useState(false);
  const [built, setBuilt] = useState(0);
  const [last, setLast] = useState<BatchResult | null>(null);
  const router = useRouter();
  async function run() {
    setRunning(true);
    let total = 0;
    for (;;) {
      const r = await buildBrains();
      total += r.built;
      setBuilt(total);
      setLast(r);
      if (r.remaining <= 0 || r.built === 0) break;
    }
    setRunning(false);
    router.refresh();
  }
  return (
    <div className="space-y-2">
      <button type="button" onClick={run} disabled={running}
        className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink disabled:opacity-60">
        {running ? `Building… ${built} done${last ? `, ${last.remaining} to go` : ""}` : "Build relationship memories"}
      </button>
      {!running && last && (
        <p className="text-sm text-muted">
          {built} memories built.{last.remaining > 0 ? ` ${last.remaining} left.` : " Everyone with history is up to date."}
        </p>
      )}
      {last?.errors.slice(0, 3).map((e, i) => <p key={i} className="text-xs text-warn">{e}</p>)}
    </div>
  );
}

export function PrepButton({ meetingId, label }: { meetingId: string; label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="text-right">
      <button type="button" disabled={pending} className="text-sm font-medium text-accent disabled:opacity-50"
        onClick={() => start(async () => setError(await prepMeeting(meetingId)))}>
        {pending ? "Preparing…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-warn">{error}</p>}
    </div>
  );
}
