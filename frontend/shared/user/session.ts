export const SESSION_EXPIRED_EVENT = "poulix:session-expired";
export const SESSION_SYNC_STORAGE_KEY = "poulix:session-sync";

const PUBLIC_AUTH_PATHS = ["/login", "/register", "/deposit/callback"];

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function broadcastSessionLogout() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SESSION_SYNC_STORAGE_KEY,
      JSON.stringify({ type: "logout", at: Date.now() }),
    );
  } catch {
    // Storage can be unavailable in private browsing.
  }
}

export function notifySessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  broadcastSessionLogout();
}
