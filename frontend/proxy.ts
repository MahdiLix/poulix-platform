import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PATHNAME_HEADER } from "@/shared/user/pathname-header";

const PROTECTED_PREFIXES = [
  "/",
  "/transfer",
  "/send",
  "/deposit",
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

const SESSION_COOKIE = "poulix_session";

function clearClientSession(response: NextResponse) {
  // Attributes must match the backend Set-Cookie on login so browsers
  // actually delete the HttpOnly session cookie.
  const secure = process.env.APP_ENV === "production";
  response.cookies.set(SESSION_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure,
  });
}

function nextWithPath(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

function readSessionToken(request: NextRequest): string | undefined {
  const fromStore = request.cookies.get(SESSION_COOKIE)?.value;
  if (fromStore) return fromStore;

  // Fallback: parse the Cookie header directly. The Next cookie store has
  // been observed to miss the HttpOnly JWT in this Proxy/middleware path.
  const header = request.headers.get("cookie");
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${SESSION_COOKIE}=`)) continue;
    const raw = trimmed.slice(SESSION_COOKIE.length + 1);
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  return undefined;
}

function isExpiredJwt(token?: string): boolean {
  if (!token) return false;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return true;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = readSessionToken(request);
  const tokenExpired = isExpiredJwt(token);

  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isPublic) {
    if (token && tokenExpired) {
      const response = nextWithPath(request);
      clearClientSession(response);
      return response;
    }
    return nextWithPath(request);
  }

  const isProtected =
    pathname === "/" ||
    PROTECTED_PREFIXES.some(
      (prefix) => prefix !== "/" && pathname.startsWith(prefix),
    );

  if (isProtected && (!token || tokenExpired)) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    // Only wipe cookies when we positively detected an expired JWT.
    // If the token is merely absent, do not clear — a parse miss must not
    // destroy a valid HttpOnly session.
    if (tokenExpired) {
      clearClientSession(response);
    }
    return response;
  }

  return nextWithPath(request);
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
