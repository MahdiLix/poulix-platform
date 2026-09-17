"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiRequestError } from "@/shared/api";
import type { AuthUser } from "@/shared/api";
import { getUserInitials } from "@/shared/user/displayName";
import { clearSavedBalanceForUser } from "@/features/wallet/hooks/useWalletBalance";
import {
  SESSION_EXPIRED_EVENT,
  broadcastSessionLogout,
  isCredentialPath,
  isPublicAuthPath,
  subscribeSessionLogout,
} from "@/shared/user/session";

type UserStatus = "loading" | "ready" | "unauthenticated" | "error";

type UserContextType = {
  user: AuthUser | null;
  status: UserStatus;
  refresh: () => void;
  signOut: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);
const SESSION_RECHECK_INTERVAL_MS = 5_000;

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (isPublicAuthPath(window.location.pathname)) return;
  window.location.assign("/login");
}

export function UserProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [status, setStatus] = useState<UserStatus>(
    initialUser ? "ready" : "loading",
  );
  const signingOut = useRef(false);
  const redirected = useRef(false);
  const userRef = useRef<AuthUser | null>(null);
  const expiryTimer = useRef<number | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimer.current == null) return;
    window.clearTimeout(expiryTimer.current);
    expiryTimer.current = null;
  }, []);

  const signOut = useCallback(
    async (redirect = true) => {
      if (signingOut.current) return;
      signingOut.current = true;
      clearExpiryTimer();

      // Wait for the backend to revoke the session and clear the HttpOnly
      // cookie before navigating. Otherwise /login still carries a valid
      // cookie and the route guard bounces the user back home.
      try {
        await api.logout();
      } catch {
        // Expired or already-revoked sessions still complete local logout.
      }

      clearSavedBalanceForUser(userRef.current?.id);
      broadcastSessionLogout();
      setUser(null);
      setStatus("unauthenticated");
      if (redirect && !redirected.current) {
        redirected.current = true;
        redirectToLogin();
      }
      signingOut.current = false;
    },
    [clearExpiryTimer],
  );

  const scheduleExpiry = useCallback(
    (expiresAt?: string) => {
      clearExpiryTimer();
      if (!expiresAt || typeof window === "undefined") return;
      const delay = Date.parse(expiresAt) - Date.now();
      if (!Number.isFinite(delay) || delay <= 0) return;
      expiryTimer.current = window.setTimeout(() => {
        void signOut();
      }, delay);
    },
    [clearExpiryTimer, signOut],
  );

  const refresh = useCallback(async () => {
    if (
      typeof window !== "undefined" &&
      isCredentialPath(window.location.pathname)
    ) {
      clearExpiryTimer();
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }
    const now = Date.now();
    if (now - lastRefreshAt.current < SESSION_RECHECK_INTERVAL_MS) {
      return;
    }
    lastRefreshAt.current = now;

    // On protected routes, the HttpOnly session cookie is authoritative, so
    // probe /users/me with credentials to determine the real auth status.
    const pending = (async () => {
      setStatus((current) => (current === "ready" ? current : "loading"));
      try {
        const data = (await api.getMe()) as AuthUser;
        setUser(data);
        setStatus("ready");
        scheduleExpiry(data.expiresAt);
      } catch (err) {
        const unauthorized =
          err instanceof ApiRequestError &&
          (err.status === 401 || err.status === 403);
        if (unauthorized) {
          clearExpiryTimer();
          setUser(null);
          setStatus("unauthenticated");
          if (
            typeof window !== "undefined" &&
            !isPublicAuthPath(window.location.pathname)
          ) {
            redirectToLogin();
          }
          return;
        }
        if (err instanceof ApiRequestError && err.status === 429) {
          if (userRef.current) {
            setStatus("ready");
          } else if (
            typeof window !== "undefined" &&
            isPublicAuthPath(window.location.pathname)
          ) {
            setStatus("unauthenticated");
          }
          return;
        }
        if (userRef.current) {
          setStatus("ready");
          return;
        }
        setUser(null);
        setStatus("error");
      }
    })();
    refreshInFlight.current = pending;
    try {
      await pending;
    } finally {
      if (refreshInFlight.current === pending) {
        refreshInFlight.current = null;
      }
    }
  }, [clearExpiryTimer, scheduleExpiry]);

  useEffect(() => {
    if (initialUser) {
      scheduleExpiry(initialUser.expiresAt);
      return;
    }
    if (
      typeof window !== "undefined" &&
      isCredentialPath(window.location.pathname)
    ) {
      setStatus("unauthenticated");
      return;
    }
    void refresh();
  }, [initialUser, refresh, scheduleExpiry]);

  useEffect(() => {
    return () => clearExpiryTimer();
  }, [clearExpiryTimer]);

  useEffect(() => {
    function onExpired() {
      signOut();
    }
    function recheckSession() {
      void refresh();
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") recheckSession();
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener("focus", recheckSession);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const unsubscribe = subscribeSessionLogout(() => {
      void signOut();
    });
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.removeEventListener("focus", recheckSession);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribe();
    };
  }, [refresh, signOut]);

  return (
    <UserContext.Provider value={{ user, status, refresh, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export function useUserInitials(user?: AuthUser | null) {
  return getUserInitials(user);
}
