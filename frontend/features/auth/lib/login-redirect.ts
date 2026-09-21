import { flashToast } from "@/shared/ui/Toast";

const FALLBACK_PATH = "/";

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function sanitizeReturnPath(path: string | null | undefined): string {
  if (!path) return FALLBACK_PATH;

  const decoded = decodePath(path.trim());
  if (!decoded.startsWith("/")) return FALLBACK_PATH;
  if (decoded.startsWith("//")) return FALLBACK_PATH;
  if (decoded.includes("://")) return FALLBACK_PATH;
  if (decoded === "/login" || decoded.startsWith("/login?")) {
    return FALLBACK_PATH;
  }
  if (decoded === "/register" || decoded.startsWith("/register?")) {
    return FALLBACK_PATH;
  }
  if (decoded.startsWith("/login/") || decoded.startsWith("/register/")) {
    return FALLBACK_PATH;
  }

  return decoded;
}

export function withReturnPath(
  href: "/login" | "/register",
  returnTo?: string | null,
): string {
  const next = sanitizeReturnPath(returnTo);
  if (next === FALLBACK_PATH) return href;
  return `${href}?next=${encodeURIComponent(next)}`;
}

export function loginRedirectUrl(returnTo?: string | null): string {
  return withReturnPath("/login", returnTo);
}

export function redirectToLoginForAction(returnTo: string, message: string) {
  flashToast({
    title: message,
    variant: "info",
  });
  if (typeof window === "undefined") return;
  window.location.assign(loginRedirectUrl(returnTo));
}
