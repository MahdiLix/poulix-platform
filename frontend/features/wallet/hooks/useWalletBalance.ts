"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, api } from "@/shared/api";
import { parseAmount } from "@/features/wallet/lib/wallet";
import { useUser } from "@/shared/user/UserProvider";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import {
  RATE_LIMIT_EVENT,
  type RateLimitEventDetail,
} from "@/shared/rate-limit/types";

export type WalletBalanceStatus =
  "idle" | "loading" | "ready" | "error" | "unauthenticated";

const LAST_BALANCE_KEY = "poulix_wallet_last_balance";

type SavedBalance = { balance: number; currency: string };

function lastBalanceStorageKey(userId: string | null): string {
  return userId ? `${LAST_BALANCE_KEY}:${userId}` : LAST_BALANCE_KEY;
}

function readSavedBalance(userId: string | null): SavedBalance | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(lastBalanceStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedBalance;
    if (
      typeof parsed.balance !== "number" ||
      !Number.isFinite(parsed.balance)
    ) {
      return null;
    }
    return {
      balance: Math.trunc(parsed.balance),
      currency: typeof parsed.currency === "string" ? parsed.currency : "IRR",
    };
  } catch {
    return null;
  }
}

function writeSavedBalance(
  userId: string | null,
  balance: number,
  currency: string,
) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    lastBalanceStorageKey(userId),
    JSON.stringify({ balance, currency }),
  );
}

function clearSavedBalance(userId: string | null) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(lastBalanceStorageKey(userId));
}

export function clearSavedBalanceForUser(userId?: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LAST_BALANCE_KEY);
  if (userId) {
    window.sessionStorage.removeItem(`${LAST_BALANCE_KEY}:${userId}`);
  }
}

function isRateLimitError(err: unknown): boolean {
  if (err instanceof ApiRequestError && err.status === 429) {
    return true;
  }
  if (err && typeof err === "object" && "status" in err) {
    return (err as { status?: unknown }).status === 429;
  }
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /too many requests/i.test(message);
}

function retryAfterSeconds(err: unknown): number {
  if (err instanceof ApiRequestError && err.retryAfter) {
    return Math.max(1, err.retryAfter);
  }
  return 1;
}

export function useWalletBalance() {
  const { t } = useLanguage();
  const { status: authStatus, user } = useUser();
  const userId = user?.id ?? null;
  const [status, setStatus] = useState<WalletBalanceStatus>("idle");
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("IRR");
  const [error, setError] = useState<string | null>(null);
  const retryTimer = useRef<number>(0);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const refresh = useCallback(async () => {
    if (authStatus === "loading") {
      return;
    }
    if (authStatus === "unauthenticated") {
      clearSavedBalance(null);
      setStatus("unauthenticated");
      setBalance(null);
      setError(null);
      return;
    }

    const saved = readSavedBalance(userId);
    if (saved) {
      setBalance((current) => current ?? saved.balance);
      setCurrency(saved.currency);
    }
    setStatus((current) =>
      current === "ready" || saved ? "ready" : "loading",
    );
    setError(null);

    try {
      const data = await api.getBalance();
      if (
        !data ||
        (typeof data.balance !== "string" && typeof data.balance !== "number")
      ) {
        throw new Error(t.messages.balanceResponseInvalid);
      }

      const nextBalance = parseAmount(data.balance);
      const nextCurrency =
        typeof data.currency === "string" ? data.currency : "IRR";
      writeSavedBalance(userId, nextBalance, nextCurrency);
      setBalance(nextBalance);
      setCurrency(nextCurrency);
      setStatus("ready");
      if (typeof window !== "undefined") {
        window.clearTimeout(retryTimer.current);
      }
    } catch (err: unknown) {
      if (isRateLimitError(err)) {
        if (saved) {
          setBalance((current) => current ?? saved.balance);
          setCurrency(saved.currency);
        }
        setError(null);
        setStatus((current) =>
          current === "unauthenticated" ? current : "ready",
        );
        if (typeof window !== "undefined") {
          window.clearTimeout(retryTimer.current);
          retryTimer.current = window.setTimeout(
            () => {
              void refreshRef.current();
            },
            retryAfterSeconds(err) * 1000,
          );
        }
        return;
      }

      if (err instanceof ApiRequestError && err.status === 401) {
        clearSavedBalance(userId);
        setStatus("unauthenticated");
        setBalance(null);
        setError(null);
        return;
      }

      setBalance(null);
      setError(localizeError(err, t.messages, "failedToLoadBalance"));
      setStatus("error");
    }
  }, [t.messages, authStatus, userId]);

  refreshRef.current = refresh;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onRateLimit(event: Event) {
      const detail = (event as CustomEvent<RateLimitEventDetail>).detail;
      if (detail?.type !== "expired") return;
      if (detail.action === "login" || detail.action === "register") return;
      void refresh();
    }

    window.addEventListener(RATE_LIMIT_EVENT, onRateLimit);
    return () => {
      window.removeEventListener(RATE_LIMIT_EVENT, onRateLimit);
      window.clearTimeout(retryTimer.current);
    };
  }, [refresh]);

  return { status, balance, currency, error, refresh };
}
