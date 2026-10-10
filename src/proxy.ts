import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pages anyone can see. Cron authenticates with CRON_SECRET instead of a session.
const PUBLIC = ["/login", "/signup", "/forgot", "/auth", "/welcome", "/privacy", "/terms", "/manifest.webmanifest", "/api/cron", "/api/stripe/webhook"];

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] as const;

// Visitors on the old Vercel address move to the real domain. APIs (webhooks, cron, Google's callback) and auth
// links stay put, since they're mid-flow and their cookies live on the old host.
const OLD_HOST = "orbit-zeta-ashen.vercel.app";
const DOMAIN = "buildyourorbit.com";

const clean = (v: string | null) => (v ?? "").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 60);

/** First-touch source: UTM tags, then ad click ids, then the referring site. Kept 90 days; the first touch wins. */
function sourceCookie(request: NextRequest): string | null {
  if (request.cookies.has("orbit_src")) return null;
  const q = request.nextUrl.searchParams;
  let source = clean(q.get("utm_source")) || clean(q.get("ref"));
  if (!source && q.has("fbclid")) source = "meta";
  if (!source && q.has("ttclid")) source = "tiktok";
  if (!source) {
    try {
      const refHost = new URL(request.headers.get("referer") ?? "").hostname.replace(/^www\./, "");
      if (refHost && !refHost.endsWith(DOMAIN) && refHost !== OLD_HOST && !/(^|\.)(google\.com|supabase\.co|stripe\.com)$/.test(refHost)) source = clean(refHost);
    } catch { /* no referrer */ }
  }
  if (!source) return null;
  return encodeURIComponent(JSON.stringify({ source, medium: clean(q.get("utm_medium")), campaign: clean(q.get("utm_campaign")) }));
}

export async function proxy(request: NextRequest) {
  const res = await handle(request);
  const src = sourceCookie(request);
  if (src) res.cookies.set("orbit_src", src, { maxAge: 90 * 86_400, path: "/", sameSite: "lax", secure: true });
  return res;
}

async function handle(request: NextRequest) {
  const { host, pathname, search } = request.nextUrl;
  if (host === OLD_HOST && !pathname.startsWith("/api") && !pathname.startsWith("/auth")) {
    return NextResponse.redirect(`https://${DOMAIN}${pathname}${search}`, 308);
  }
  // A deploy without its settings should say so plainly instead of a bare 500.
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    return new NextResponse(`Orbit is missing configuration: ${missing.join(", ")}. Add it in Vercel → Settings → Environment Variables, then redeploy.`, { status: 503 });
  }
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|sw.js|.*\\.(?:png|svg|jpg|webp|mp4)$).*)"],
};
