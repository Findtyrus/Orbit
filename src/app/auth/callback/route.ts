import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Finishes email confirmation and Google sign-in (Supabase PKCE code exchange). */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, request.url));
  }
  // Supabase confirms the email before redirecting here. If the link opened in a different browser than the one
  // used to sign up (common with home-screen apps), the session can't be created here, but the account is confirmed.
  if (safeNext === "/reset") {
    return NextResponse.redirect(new URL("/login?error=Open+the+reset+link+on+the+same+device+you+requested+it+from,+or+request+a+new+one.", request.url));
  }
  return NextResponse.redirect(new URL("/login?notice=Your+email+is+confirmed.+Sign+in+to+continue.", request.url));
}
