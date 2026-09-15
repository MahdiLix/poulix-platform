"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { useToast } from "@/shared/ui/Toast";
import {
  RATE_LIMIT_EVENT,
  isAuthRateLimitAction,
  isGlobalRateLimitName,
  type RateLimitAction,
  type RateLimitEventDetail,
} from "./types";
import {
  getActionQuota,
  getRateLimitEpoch,
  getRateLimitState,
  remainingSeconds,
  subscribeRateLimit,
} from "./store";

function actionTitle(
  action: RateLimitAction | "global",
  messages: ReturnType<typeof useLanguage>["t"]["messages"],
  name?: string,
) {
  if (name === "lockout") {
    return messages.accountTemporarilyLocked;
  }
  switch (action) {
    case "deposit":
      return messages.depositRateLimited;
    case "withdraw":
      return messages.withdrawRateLimited;
    case "transfer":
      return messages.transferRateLimited;
    case "scheduled":
      return messages.scheduledRateLimited;
    case "destinations":
      return messages.destinationsRateLimited;
    case "securityLimits":
      return messages.securityLimitsRateLimited;
    case "login":
      return messages.loginRateLimited;
    case "register":
      return messages.registerRateLimited;
    default:
      return messages.rateLimitBurstExceeded;
  }
}

export function RateLimitProvider({ children }: { children: ReactNode }) {
  const { t, isLanguageReady } = useLanguage();
  const { pushToast } = useToast();

  useEffect(() => {
    if (!isLanguageReady) return undefined;

    function onRateLimit(event: Event) {
      const detail = (event as CustomEvent<RateLimitEventDetail>).detail;
      if (!detail) return;

      if (detail.type === "warning") {
        if (isGlobalRateLimitName(detail.name)) return;
        pushToast({
          variant: "warning",
          title: t.messages.rateLimitNearLimit,
        });
        return;
      }

      if (detail.type === "expired") {
        pushToast({
          variant: "success",
          title: t.messages.rateLimitCooldownFinished,
        });
        return;
      }

      if (detail.alreadyActive) return;

      if (
        (detail.action === "login" || detail.action === "register") &&
        detail.name !== "lockout"
      ) {
        return;
      }

      if (detail.action === "global") {
        pushToast({
          variant: "danger",
          title: t.messages.rateLimitBurstExceeded,
          description: t.messages.rateLimitBurstExceededDetail,
        });
        return;
      }

      pushToast({
        variant: "danger",
        title: actionTitle(detail.action, t.messages, detail.name),
        description:
          detail.name === "lockout"
            ? undefined
            : t.messages.rateLimitActionWait,
      });
    }

    window.addEventListener(RATE_LIMIT_EVENT, onRateLimit);
    return () => window.removeEventListener(RATE_LIMIT_EVENT, onRateLimit);
  }, [isLanguageReady, pushToast, t.messages]);

  return children;
}

export function withRemainingLabel(label: string, remaining: number) {
  return remaining > 0 ? `${label} (${remaining})` : label;
}

export function useRateLimitAction(action: RateLimitAction) {
  const epoch = useSyncExternalStore(
    subscribeRateLimit,
    getRateLimitEpoch,
    () => 0,
  );
  void epoch;
  const snapshot = getRateLimitState();
  const ownUntil = snapshot.actions[action] ?? 0;
  const lockoutUntil = action === "login" ? snapshot.lockoutUntil : 0;
  const globalUntil = isAuthRateLimitAction(action) ? 0 : snapshot.globalUntil;
  const until = Math.max(ownUntil, lockoutUntil, globalUntil);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (until <= Date.now()) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [until]);

  const remaining = remainingSeconds(until, now);
  const lockoutSeconds = remainingSeconds(lockoutUntil, now);
  const quota = getActionQuota(action);

  return {
    blocked: remaining > 0,
    remainingSeconds: remaining,
    remainingAttempts: quota?.remaining,
    attemptLimit: quota?.limit,
    lockedOut: lockoutSeconds > 0,
    globalBlocked: remainingSeconds(snapshot.globalUntil, now) > 0,
    globalRemaining: remainingSeconds(snapshot.globalUntil, now),
  };
}
