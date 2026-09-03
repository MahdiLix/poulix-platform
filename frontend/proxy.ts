import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/",
  "/transfer",
  "/send",
  "/scheduled",
  "/goals",
  "/envelopes",
  "/destinations",
  "/security",
  "/profile",
  "/history",
  "/notifications",
  "/admin",
  "/statistics",
];

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/deposit/callback",
  "/api",
  "/_next",
  "/favicon.ico",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get("poulix_access_token")?.value;

  const isProtected =
    pathname === "/" ||
    PROTECTED_PREFIXES.some(
      (prefix) => prefix !== "/" && pathname.startsWith(prefix),
    );

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Keep middleware export alias for compatibility
export const middleware = proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
