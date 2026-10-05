import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages anyone can see. Cron authenticates with CRON_SECRET instead of a session.
const PUBLIC = ["/login", "/signup", "/auth", "/welcome", "/privacy", "/terms", "/manifest.webmanifest", "/api/cron", "/api/stripe/webhook"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!data.user && !PUBLIC.some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL(path === "/" ? "/welcome" : "/login", request.url));
  }
  if (data.user && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|sw.js|.*\\.(?:png|svg|jpg|webp)$).*)"],
};
