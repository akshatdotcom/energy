import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEMO_SESSION_COOKIE } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const hasCookie = request.cookies.has(DEMO_SESSION_COOKIE);
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && !hasCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
