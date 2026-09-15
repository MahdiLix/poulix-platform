"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { cn } from "@/shared/cn";
import type { UserAccountStatus } from "@/features/admin/lib/admin";

type AccountAction = "disable" | "enable" | "lock" | "unlock";

export function UserStatusActions({
  userId,
  status,
  compact = false,
  onUpdated,
}: {
  userId: string;
  status?: UserAccountStatus | null;
  compact?: boolean;
  onUpdated?: () => void;
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: AccountAction, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return;
    setBusy(true);
    setError(null);
    try {
      if (action === "disable") await api.adminDisableUser(userId);
      if (action === "enable") await api.adminEnableUser(userId);
      if (action === "lock") await api.adminLockUser(userId);
      if (action === "unlock") await api.adminUnlockUser(userId);
      onUpdated?.();
    } catch (err) {
      setError(localizeError(err, t.messages, "failedToLoadAdmin"));
    } finally {
      setBusy(false);
    }
  }

  const normalizedStatus = status ?? "ACTIVE";

  const actions =
    normalizedStatus === "ACTIVE"
      ? [
          {
            action: "disable" as const,
            label: t.admin.disable,
            confirm: t.admin.confirmDisable,
            variant: "danger" as const,
          },
          {
            action: "lock" as const,
            label: t.admin.lock,
            confirm: t.admin.confirmLock,
            variant: "outline" as const,
          },
        ]
      : normalizedStatus === "DISABLED"
        ? [
            {
              action: "enable" as const,
              label: t.admin.enable,
              confirm: t.admin.confirmEnable,
              variant: "primary" as const,
            },
          ]
        : [
            {
              action: "unlock" as const,
              label: t.admin.unlock,
              confirm: t.admin.confirmUnlock,
              variant: "secondary" as const,
            },
          ];

  return (
    <div className={cn("flex flex-col gap-1.5", compact && "items-end")}>
      <div className={cn("flex flex-wrap gap-1.5", compact && "justify-end")}>
        {actions.map((item) => (
          <Button
            key={item.action}
            size="sm"
            variant={item.variant}
            disabled={busy}
            className="w-auto"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void run(item.action, item.confirm);
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {error ? (
        <p className="max-w-[220px] text-[11px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
