import { saveProfile } from "@/app/profile-actions";

export const ROLES = [
  "Audit", "Tax", "Transaction Advisory / FDD", "Valuation", "Investment Banking", "Private Equity",
  "Corporate Development", "Corporate Finance / FP&A", "Consulting", "Search Fund / ETA", "Equity Research", "Other",
];

export type ProfileRow = {
  name: string; school: string; grad_year: number | null; location: string; target_roles: string[]; target_firms: string[];
  about: string; goals: string;
};

const field = "w-full rounded-md border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-accent placeholder:text-faint";

export function ProfileForm({ p, next, submitLabel = "Save" }: { p: Partial<ProfileRow>; next?: string; submitLabel?: string }) {
  return (
    <form action={saveProfile} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="grid grid-cols-2 gap-2">
        <input name="name" defaultValue={p.name ?? ""} required placeholder="Full name" className={`${field} col-span-2`} />
        <input name="school" defaultValue={p.school ?? ""} placeholder="School" className={field} />
        <input name="grad_year" type="number" inputMode="numeric" defaultValue={p.grad_year ?? ""} placeholder="Grad year" className={field} />
        <input name="location" defaultValue={p.location ?? ""} placeholder="Where you want to work (e.g. Dallas, TX)" className={`${field} col-span-2`} />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">What are you recruiting for?</legend>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <label key={r} className="cursor-pointer">
              <input type="checkbox" name="target_roles" value={r} defaultChecked={p.target_roles?.includes(r)} className="peer sr-only" />
              <span className="inline-block rounded-md border border-line bg-card px-3 py-1.5 text-sm text-muted transition-colors peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">{r}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Target firms <span className="font-normal text-muted">(comma-separated)</span></span>
        <input name="target_firms" defaultValue={p.target_firms?.join(", ") ?? ""} placeholder="e.g. Deloitte, RSM, Alvarez & Marsal, Houlihan Lokey" className={field} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Your background</span>
        <textarea name="about" rows={3} defaultValue={p.about ?? ""} placeholder="Major, internships, certifications (CPA track?), clubs, what makes you you…" className={field} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">What are you working toward?</span>
        <textarea name="goals" rows={2} defaultValue={p.goals ?? ""} placeholder="e.g. Land a TAS internship for summer 2027; learn how people moved from audit into banking" className={field} />
      </label>

      <button className="w-full rounded-md bg-accent py-3 font-medium text-accent-ink">{submitLabel}</button>
    </form>
  );
}
