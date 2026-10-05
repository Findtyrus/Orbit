import Link from "next/link";

export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "privacy@example.com";
export const UPDATED = "October 5, 2026";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="space-y-4 pt-4 text-sm leading-relaxed [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
      <Link href="/welcome" className="text-sm text-muted">← Orbit</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-muted">Last updated {UPDATED}</p>
      {children}
    </article>
  );
}
