import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { gmailAllowed, googleScopes, oauthClient } from "@/lib/google";

export async function GET(request: NextRequest) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/me?google=missing-config", request.url));
  }
  const { user } = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const state = randomBytes(16).toString("hex");
  const url = oauthClient(request.nextUrl.origin).generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // always return a refresh token
    include_granted_scopes: true,
    scope: googleScopes(gmailAllowed(user.email)),
    login_hint: user.email,
    state,
  });
  const res = NextResponse.redirect(url);
  const next = request.nextUrl.searchParams.get("next");
  if (next?.startsWith("/") && !next.startsWith("//")) {
    res.cookies.set("google_oauth_next", next, { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" });
  }
  res.cookies.set("google_oauth_state", state, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", maxAge: 600, path: "/" });
  return res;
}
