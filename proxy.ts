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

  // Skip auth for public/webhook paths
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) {
    return NextResponse.next();
  }

  // In development, skip auth but still add headers
  if (DEV_SKIP_AUTH) {
    const response = NextResponse.next();
    response.headers.set("X-Farmer-Phone", "+919876543210");
    response.headers.set("X-Auth-Mode", "dev-bypass");
    return response;
  }

  // ── Firebase Auth Token Verification ──
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  try {
    // Verify with Firebase Admin (using REST endpoint for edge runtime)
    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;
    const verifyRes = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: "Invalid authentication token" },
        { status: 401 }
      );
    }

    const verifyData = await verifyRes.json();
    const user = verifyData.users?.[0];

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    // ── Rate Limiting (header-based tracking) ──
    const identifier = user.phoneNumber || user.localId || "unknown";
    const rateLimitKey = `ratelimit:${identifier}`;

    // We can't use Redis directly in edge middleware, so we use
    // a lightweight header-based approach. The actual Redis rate
    // limiting happens in the route handlers via the checkRateLimit function.

    const response = NextResponse.next();
    response.headers.set("X-Farmer-Phone", user.phoneNumber || "");
    response.headers.set("X-Farmer-UID", user.localId || "");
    response.headers.set("X-RateLimit-Key", rateLimitKey);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
