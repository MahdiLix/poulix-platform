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
import {
  api,
  getStoredToken,
  removeStoredToken,
  ApiRequestError,
} from "@/shared/api";
import type { AuthUser } from "@/shared/api";
import { getUserInitials } from "@/shared/user/displayName";
import {
  SESSION_EXPIRED_EVENT,
  SESSION_SYNC_STORAGE_KEY,
  broadcastSessionLogout,
  decodeJwtPayload,
  getTokenExpiryMs,
  isPublicAuthPath,
  isTokenExpired,
} from "@/shared/user/session";

type UserStatus = "loading" | "ready" | "unauthenticated" | "error";

type UserContextType = {
  user: AuthUser | null;
  status: UserStatus;
  refresh: () => void;
  signOut: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

function userFromAccessToken(token: string): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.sub || !payload.email) return null;
  return { id: payload.sub, email: payload.email };
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (isPublicAuthPath(window.location.pathname)) return;
  window.location.assign("/login");
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<UserStatus>("loading");
  const expiryTimer = useRef<number | null>(null);
  const signingOut = useRef(false);
  const redirected = useRef(false);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimer.current != null) {
      window.clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
  }, []);

  const signOut = useCallback(
    (redirect = true) => {
      if (signingOut.current) return;
      signingOut.current = true;

      if (getStoredToken()) {
        // fetchWithAuth reads the cookie before its first await, so revocation is
        // already in flight when the local cookie is cleared below.
        void api.logout().catch(() => {});
      }
      clearExpiryTimer();
      removeStoredToken();
      broadcastSessionLogout();
      setUser(null);
      setStatus("unauthenticated");
      signingOut.current = false;
      if (redirect && !redirected.current) {
        redirected.current = true;
        redirectToLogin();
      }
    },
    [clearExpiryTimer],
  );

  const scheduleExpiry = useCallback(
    (token: string | null) => {
      clearExpiryTimer();
      if (!token) return;
      const expiryMs = getTokenExpiryMs(token);
      if (expiryMs == null) return;
      const delay = expiryMs - Date.now();
      if (delay <= 0) {
        signOut();
        return;
      }
      expiryTimer.current = window.setTimeout(() => {
        signOut();
      }, delay);
    },
    [clearExpiryTimer, signOut],
  );

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
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

    scheduleExpiry(token);
    const optimistic = userFromAccessToken(token);
    if (optimistic) {
      setUser((current) => current ?? optimistic);
    }
    if (!optimistic) {
      setStatus("loading");
    }
    try {
      const data = (await api.getMe()) as AuthUser;
      setUser(data);
      setStatus("ready");
    } catch (err) {
      if (!getStoredToken()) {
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
        if (optimistic) {
          setStatus("ready");
        }
        return;
      }
      if (optimistic) {
        setStatus("ready");
        return;
      }
      setUser(null);
      setStatus("error");
    }
  }, [clearExpiryTimer, scheduleExpiry]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onExpired() {
      signOut();
    }
    function onStorage(event: StorageEvent) {
      if (event.key === SESSION_SYNC_STORAGE_KEY) signOut();
    }
    function recheckExpiry() {
      const token = getStoredToken();
      if (!token || isTokenExpired(token)) {
        signOut();
        return;
      }
      scheduleExpiry(token);
    }
    function onVisibilityChange() {
      if (document.visibilityState === "visible") recheckExpiry();
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", recheckExpiry);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", recheckExpiry);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearExpiryTimer();
    };
  }, [clearExpiryTimer, scheduleExpiry, signOut]);

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
