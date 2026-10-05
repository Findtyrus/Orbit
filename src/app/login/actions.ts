"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

export async function signIn(_prev: string | null, form: FormData): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (error) return error.message;
  redirect("/");
}

export type SignUpState = { error?: string; sent?: string } | null;

export async function signUp(_prev: SignUpState, form: FormData): Promise<SignUpState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "").trim();
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  if (!form.get("agree")) return { error: "Please agree to the Terms and Privacy Policy." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${await origin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/onboarding"); // email confirmation disabled in Supabase
  return { sent: email };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=/` },
  });
  if (error || !data.url) redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in failed")}`);
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welcome");
}
