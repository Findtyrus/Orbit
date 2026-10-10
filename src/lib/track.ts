import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "./supabase/admin";

/** Where a visitor first came from, set by the proxy from UTM tags, click ids or the referrer. */
export type Source = { source?: string; medium?: string; campaign?: string };

export async function readSource(): Promise<Source> {
  const raw = (await cookies()).get("orbit_src")?.value;
  if (!raw) return {};
  try {
    const v = JSON.parse(decodeURIComponent(raw));
    return typeof v === "object" && v ? v : {};
  } catch {
    return {};
  }
}

/** Records a funnel event once per user. Returns true only the first time. Never throws: tracking must not break the app. */
export async function trackOnce(userId: string, name: string, props: Record<string, unknown> = {}, at?: string): Promise<boolean> {
  if (!process.env.SUPABASE_SECRET_KEY) return false;
  try {
    const { data } = await createAdminClient().from("events")
      .upsert({ user_id: userId, name, props, ...(at ? { created_at: at } : {}) }, { onConflict: "user_id,name", ignoreDuplicates: true })
      .select("id");
    return !!data?.length;
  } catch {
    return false;
  }
}

/** Signup (with source) and one "active" mark per day, so week-two return can be counted. */
export async function trackVisit(user: { id: string; created_at: string }) {
  await trackOnce(user.id, "signup", await readSource(), user.created_at);
  await trackOnce(user.id, `active:${new Date().toISOString().slice(0, 10)}`);
}

/** True for roughly the first hour after sign-up, when the ad pixels should count a registration. */
export const isFreshSignup = (createdAt: string) => Date.now() - Date.parse(createdAt) < 3_600_000;
