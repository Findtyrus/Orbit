import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

const TABLES = ["profiles", "contacts", "interactions", "synopses", "commitments", "meetings"] as const;

/** Everything Orbit stores about you, as one JSON file (OAuth tokens excluded). */
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), email: user.email };
  for (const t of TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase.from(t).select("*").range(from, from + 999);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      rows.push(...data);
      if (data.length < 1000) break;
    }
    out[t] = rows;
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="orbit-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
