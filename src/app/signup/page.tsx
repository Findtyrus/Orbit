import { SignUpForm } from "@/components/AuthForms";
import { Logo } from "@/components/Logo";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[80vh] flex-col justify-center">
      <div className="mb-10"><Logo size={26} /></div>
      <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 mb-8 text-muted">Free while in beta. Takes about 5 minutes to set up.</p>
      <SignUpForm />
    </div>
  );
}
