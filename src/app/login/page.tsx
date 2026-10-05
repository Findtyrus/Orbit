import { LoginForm } from "@/components/AuthForms";
import { Logo } from "@/components/Logo";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const error = sp.error;
  const notice = typeof sp.notice === "string" ? sp.notice : null;
  return (
    <div className="flex min-h-[80vh] flex-col justify-center">
      <div className="mb-10"><Logo size={26} /></div>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1 mb-8 text-muted">Sign in to Orbit.</p>
      {notice && <p className="mb-4 rounded-md border border-good/30 bg-good-soft p-3 text-sm text-good">{notice}</p>}
      <LoginForm initialError={typeof error === "string" ? error : undefined} />
    </div>
  );
}
