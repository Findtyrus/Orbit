import { NextResponse, type NextRequest } from "next/server";
import { runScheduledJobs } from "@/lib/jobs";

export const maxDuration = 300;

/** Scheduled jobs for every user (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ results: await runScheduledJobs(270_000) });
}
