export type ContactStatus = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  company: string | null;
  title: string | null;
  linkedin_url: string | null;
  connected_on: string | null;
  source: string;
  stage: string;
  cadence_days: number | null;
  snoozed_until: string | null;
  starred: boolean;
  notes: string | null;
  tags: string[];
  last_interaction_at: string | null;
  last_outbound_at: string | null;
  last_inbound_at: string | null;
  interaction_count: number;
  meeting_count: number;
  last_direction: "in" | "out" | null;
  next_due: string | null;
  score: number;
  strength: Strength;
  awaiting_reply: boolean;
};

export type Strength = "New" | "Developing" | "Warm" | "Strong" | "Dormant";

export type Facts = {
  career?: string[];
  they_told_you?: string[];
  you_told_them?: string[];
  advice_given?: string[];
  personal?: string[];
};

export type Synopsis = {
  contact_id: string;
  summary: string;
  talking_points: string[];
  facts: Facts;
  next_step: string | null;
  why_now: string | null;
  suggested_message: string | null;
  follow_up_on: string | null;
  interactions_seen: string | null;
  source_count: number;
  generated_at: string;
};

export type Commitment = {
  id: string;
  contact_id: string;
  text: string;
  owner: "me" | "them";
  due_on: string | null;
  status: "open" | "done" | "dismissed";
};

export type Interaction = {
  id: string;
  kind: "linkedin_message" | "email" | "meeting" | "note" | "call";
  direction: "in" | "out" | null;
  occurred_at: string;
  subject: string | null;
  body: string | null;
};

export const CADENCES = [
  { days: 14, label: "Every 2 weeks" },
  { days: 30, label: "Monthly" },
  { days: 60, label: "Every 2 months" },
  { days: 90, label: "Quarterly" },
  { days: 180, label: "Every 6 months" },
  { days: 365, label: "Yearly" },
];

export const fullName = (c: { first_name: string; last_name: string }) =>
  `${c.first_name} ${c.last_name}`.trim() || "Unknown";

export function relDays(iso: string | null): string {
  if (!iso) return "never";
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}y ago`;
}

/** YYYY-MM-DD for `offsetDays` from today (negative = past). */
export const isoDate = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

/** True when `iso` is missing or older than `ms`. */
export const isOlderThan = (iso: string | null | undefined, ms: number) => !iso || Date.now() - Date.parse(iso) > ms;

/** Full ISO timestamp `offsetDays` from now (fractional days allowed). */
export const isoAt = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86_400_000).toISOString();

/** "2026-10-14" -> "Oct 14" (dates are calendar days, so format in UTC to avoid timezone shifts). */
export const shortDate = (ymd: string) =>
  new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
