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

function isExpiredJwt(token?: string): boolean {
  if (!token) return false;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return false;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("poulix_access_token")?.value;
  const tokenExpired = isExpiredJwt(token);

  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isPublic) {
    if (tokenExpired) {
      const response = NextResponse.next();
      response.cookies.delete("poulix_access_token");
      return response;
    }
    if (
      token &&
      (pathname === "/login" ||
        pathname === "/register" ||
        pathname.startsWith("/login/") ||
        pathname.startsWith("/register/"))
    ) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const isProtected =
    pathname === "/" ||
    PROTECTED_PREFIXES.some(
      (prefix) => prefix !== "/" && pathname.startsWith(prefix),
    );

  if (isProtected && (!token || tokenExpired)) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    if (tokenExpired) response.cookies.delete("poulix_access_token");
    return response;
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
