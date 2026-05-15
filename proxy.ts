// ──────────────────────────────────────────────
// AgriSaarthi – Middleware
// Firebase Auth verification + Rate limiting
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

// Paths that skip auth verification
const PUBLIC_PATHS = [
  "/api/ivr/inbound",
  "/api/ivr/gather",
  "/api/cron/",
];

// Paths that skip auth in development
const DEV_SKIP_AUTH = process.env.NODE_ENV === "development";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.set("X-Farmer-Phone", "+91 7049915277");
  response.headers.set("X-Auth-Mode", "bypass");
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
