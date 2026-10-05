"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Permanently deletes the account; every table cascades from auth.users. */
export async function deleteAccount(_prev: string | null, form: FormData): Promise<string | null> {
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") return "Type DELETE to confirm.";
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) return error.message;
  await supabase.auth.signOut();
  redirect("/welcome");
}
