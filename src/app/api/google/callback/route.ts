import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { after } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCalendar, oauthClient, syncGoogle } from "@/lib/google";
import { encryptSecret } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const back = (status: string) => {
    const next = request.cookies.get("google_oauth_next")?.value ?? "/me";
    const url = new URL(next, request.url);
    url.searchParams.set("google", status);
    const res = NextResponse.redirect(url);
    res.cookies.delete("google_oauth_state");
    res.cookies.delete("google_oauth_next");
    return res;
  };
  const { searchParams } = request.nextUrl;
  if (searchParams.get("error")) return back("denied");
  const code = searchParams.get("code");
  if (!code || searchParams.get("state") !== request.cookies.get("google_oauth_state")?.value) return back("bad-state");

  const { user } = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const client = oauthClient(request.nextUrl.origin);
  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch {
    return back("token-failed");
  }
  if (!tokens.refresh_token) return back("no-refresh-token");
  const granted = tokens.scope ?? "";
  if (!hasCalendar(granted)) return back("missing-scopes");

  client.setCredentials(tokens);
  const { data: info } = await google.oauth2({ version: "v2", auth: client }).userinfo.get();

  const db = createAdminClient();
  const { error } = await db.from("google_accounts").upsert({
    user_id: user.id,
    email: info.email ?? "",
    refresh_token: encryptSecret(tokens.refresh_token),
    scopes: granted,
    needs_reconnect: false,
    last_error: null,
  });
  if (error) return back("save-failed");

  // Kick off the first sync in the background so the redirect is instant.
  after(() => syncGoogle(user.id));
  return back("connected");
}
