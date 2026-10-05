export const FIRM_STAGES = ["Researching", "Networking", "Referral", "Applied", "Interviewing", "Offer", "Closed"] as const;
export type FirmStage = (typeof FIRM_STAGES)[number];

export const PERSON_STAGES = ["New", "Reached out", "Chat scheduled", "Chatted", "Referred me", "Mentor"] as const;
export type PersonStage = (typeof PERSON_STAGES)[number];

export const FIRM_CATEGORIES = [
  "Big 4", "Regional CPA", "Advisory", "Boutique IB", "Middle-market IB", "Bulge bracket", "Private equity", "Search fund", "Corporate", "Other",
];

export type Firm = {
  id: string;
  name: string;
  aliases: string[];
  category: string | null;
  stage: FirmStage;
  priority: number;
  deadline: string | null;
  role: string | null;
  notes: string | null;
};

// Words that don't distinguish one firm from another ("KPMG US", "RSM US LLP", "Deloitte & Touche LLP").
const NOISE = new Set(["llp", "llc", "inc", "co", "corp", "corporation", "company", "group", "us", "usa", "the", "pc", "pllc", "plc", "ltd", "lp"]);

export function normFirm(name: string): string {
  return name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/).filter((w) => w && !NOISE.has(w)).join(" ");
}

/** True when a contact's company is this firm (or one of its aliases), matching on whole words. */
export function worksAt(company: string | null | undefined, firm: Pick<Firm, "name" | "aliases">): boolean {
  if (!company) return false;
  const c = ` ${normFirm(company)} `;
  return [firm.name, ...firm.aliases].some((n) => {
    const k = normFirm(n);
    return k.length >= 2 && c.includes(` ${k} `);
  });
}

// Rough seniority so the most useful cold contacts surface first (analysts/associates reply to students most).
export function approachability(title: string | null) {
  const t = (title ?? "").toLowerCase();
  if (/intern/.test(t)) return 1;
  if (/analyst|associate|senior|staff|consultant/.test(t)) return 3;
  if (/manager|vice president|\bvp\b/.test(t)) return 2;
  return 1.5;
}
