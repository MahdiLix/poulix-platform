export const SESSION_EXPIRED_EVENT = "poulix:session-expired";
const SESSION_CHANNEL = "poulix-session";

const PUBLIC_AUTH_PATHS = ["/login", "/register", "/deposit/callback"];
const CREDENTIAL_PATHS = ["/login", "/register"];

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isPublicAuthPath(pathname: string): boolean {
  return matchesPath(pathname, PUBLIC_AUTH_PATHS);
}

export function isCredentialPath(pathname: string): boolean {
  return matchesPath(pathname, CREDENTIAL_PATHS);
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function broadcastSessionLogout() {
  if (
    typeof window === "undefined" ||
    typeof BroadcastChannel === "undefined"
  ) {
    return;
  }
  try {
    const channel = new BroadcastChannel(SESSION_CHANNEL);
    channel.postMessage({ type: "logout", at: Date.now() });
    channel.close();
  } catch {
    // BroadcastChannel can be unavailable in some privacy modes.
  }
}

export function subscribeSessionLogout(onLogout: () => void) {
  if (
    typeof window === "undefined" ||
    typeof BroadcastChannel === "undefined"
  ) {
    return () => {};
  }
  try {
    const channel = new BroadcastChannel(SESSION_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type === "logout") onLogout();
    };
    return () => channel.close();
  } catch {
    return () => {};
  }
}

export function notifySessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  broadcastSessionLogout();
}
