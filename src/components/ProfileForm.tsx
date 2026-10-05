import { saveProfile } from "@/app/profile-actions";
import { UNIVERSITIES } from "@/lib/universities";

export const ROLE_GROUPS: { label: string; roles: string[] }[] = [
  {
    label: "Accounting & Finance",
    roles: [
      "Audit", "Tax", "Transaction Advisory / FDD", "Valuation", "Investment Banking", "Private Equity", "Corporate Development",
      "Corporate Finance / FP&A", "Equity Research", "Wealth Management", "Commercial Banking", "Search Fund / ETA",
    ],
  },
  {
    label: "Business",
    roles: [
      "Consulting", "Sales", "Marketing", "Supply Chain / Operations", "Product Management", "Data / Analytics",
      "Human Resources", "Real Estate", "Entrepreneurship",
    ],
  },
];
const KNOWN = new Set(ROLE_GROUPS.flatMap((g) => g.roles));

export type ProfileRow = {
  name: string; school: string; grad_year: number | null; location: string; target_roles: string[]; target_firms: string[];
  about: string; goals: string;
};

const field = "w-full rounded-md border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-accent placeholder:text-faint";

function Chip({ role, checked }: { role: string; checked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name="target_roles" value={role} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-block rounded-md border border-line bg-card px-3 py-1.5 text-sm text-muted transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">{role}</span>
    </label>
  );
}

export function ProfileForm({ p, next, submitLabel = "Save" }: { p: Partial<ProfileRow>; next?: string; submitLabel?: string }) {
  const roles = p.target_roles ?? [];
  const other = roles.filter((r) => !KNOWN.has(r)).join(", ");
  return (
    <form action={saveProfile} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="grid grid-cols-2 gap-2">
        <input name="name" defaultValue={p.name ?? ""} required placeholder="Full name" className={`${field} col-span-2`} />
        <input name="school" list="universities" defaultValue={p.school ?? ""} placeholder="School (start typing)" autoComplete="off" className={field} />
        <datalist id="universities">
          {UNIVERSITIES.map((u) => <option key={u} value={u} />)}
        </datalist>
        <input name="grad_year" type="number" inputMode="numeric" defaultValue={p.grad_year ?? ""} placeholder="Grad year" className={field} />
        <input name="location" defaultValue={p.location ?? ""} placeholder="Where you want to work (e.g. Dallas, TX)" className={`${field} col-span-2`} />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">What are you recruiting for?</legend>
        {ROLE_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">{g.label}</div>
            <div className="flex flex-wrap gap-2">
              {g.roles.map((r) => <Chip key={r} role={r} checked={roles.includes(r)} />)}
            </div>
          </div>
        ))}
        <input name="other_roles" defaultValue={other} placeholder="Other (comma-separated), e.g. Sports management" className={field} />
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Target companies <span className="font-normal text-muted">(comma-separated)</span></span>
        <input name="target_firms" defaultValue={p.target_firms?.join(", ") ?? ""} placeholder="e.g. Deloitte, Goldman Sachs, Procter & Gamble, Amazon" className={field} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Your background</span>
        <textarea name="about" rows={3} defaultValue={p.about ?? ""} placeholder="Major, internships, certifications, clubs, what makes you you. Or upload your resume in Account." className={field} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">What are you working toward?</span>
        <textarea name="goals" rows={2} defaultValue={p.goals ?? ""} placeholder="e.g. Land a summer 2027 internship; learn how people moved into my target role" className={field} />
      </label>

      <button className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink">{submitLabel}</button>
    </form>
  );
}
