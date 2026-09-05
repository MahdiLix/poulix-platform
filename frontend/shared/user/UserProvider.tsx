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
} from "@/shared/api";
import type { AuthUser } from "@/shared/api";
import { getUserInitials } from "@/shared/user/displayName";
import {
  SESSION_EXPIRED_EVENT,
  getTokenExpiryMs,
  isPublicAuthPath,
} from "@/shared/user/session";

type UserStatus = "loading" | "ready" | "unauthenticated" | "error";

type UserContextType = {
  user: AuthUser | null;
  status: UserStatus;
  refresh: () => void;
  signOut: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (isPublicAuthPath(window.location.pathname)) return;
  window.location.assign("/login");
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<UserStatus>("loading");
  const expiryTimer = useRef<number | null>(null);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimer.current != null) {
      window.clearTimeout(expiryTimer.current);
      expiryTimer.current = null;
    }
  }, []);

  const signOut = useCallback(
    (redirect = true) => {
      clearExpiryTimer();
      removeStoredToken();
      setUser(null);
      setStatus("unauthenticated");
      if (redirect) redirectToLogin();
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
      return;
    }

    scheduleExpiry(token);
    setStatus("loading");
    try {
      const data = (await api.getMe()) as AuthUser;
      setUser(data);
      setStatus("ready");
    } catch {
      if (!getStoredToken()) {
        setUser(null);
        setStatus("unauthenticated");
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
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      clearExpiryTimer();
    };
  }, [clearExpiryTimer, signOut]);

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
