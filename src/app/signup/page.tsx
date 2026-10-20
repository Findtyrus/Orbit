import { SignUpForm } from "@/components/AuthForms";
import { Logo } from "@/components/Logo";
import { InAppBrowserNotice } from "@/components/InstallGuide";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[80vh] flex-col justify-center">
      <div className="mb-10"><Logo size={26} /></div>
      <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 mb-6 text-muted">Free for students. Takes about 2 minutes to set up.</p>
      <div className="mb-6"><InAppBrowserNotice /></div>
      <SignUpForm />
    </div>
  );
}
