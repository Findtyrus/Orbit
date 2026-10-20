import { NextResponse, type NextRequest } from "next/server";

/** Short link for QR codes and flyers: buildyourorbit.com/join?utm_source=bap lands on sign-up, keeping its tags. */
export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/signup";
  return NextResponse.redirect(url, 307);
}
