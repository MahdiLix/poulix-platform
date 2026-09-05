export const SESSION_EXPIRED_EVENT = "poulix:session-expired";
export const DEFAULT_TOKEN_MAX_AGE_SECONDS = 900;

const PUBLIC_AUTH_PATHS = ["/login", "/register", "/deposit/callback"];

export function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;

    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (typeof payload?.exp !== "number") return null;
  return payload.exp * 1000;
}

export function getTokenMaxAgeSeconds(
  token: string,
  fallback = DEFAULT_TOKEN_MAX_AGE_SECONDS,
): number {
  const expiryMs = getTokenExpiryMs(token);
  if (expiryMs == null) return fallback;
  return Math.max(1, Math.floor((expiryMs - Date.now()) / 1000));
}

export function isTokenExpired(token: string, now = Date.now()): boolean {
  const expiryMs = getTokenExpiryMs(token);
  if (expiryMs == null) return false;
  return expiryMs <= now;
}

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function notifySessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
