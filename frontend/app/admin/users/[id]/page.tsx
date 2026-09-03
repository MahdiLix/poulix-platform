"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import type { AdminUserDetail } from "@/features/admin/lib/admin";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, language } = useLanguage();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setUser(await api.getAdminUser(id));
      setError(null);
    } catch (err) {
      setError(localizeError(err, t.messages, "failedToLoadAdmin"));
    }
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminUser(id)
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(localizeError(err, t.messages, "failedToLoadAdmin"));
      });
    return () => {
      cancelled = true;
    };
  }, [id, t.messages]);

  async function runAction(
    action: "disable" | "enable" | "lock" | "unlock",
    confirmKey: string,
  ) {
    if (!window.confirm(confirmKey)) {
      return;
    }
    setBusy(true);
    try {
      if (action === "disable") await api.adminDisableUser(id);
      if (action === "enable") await api.adminEnableUser(id);
      if (action === "lock") await api.adminLockUser(id);
      if (action === "unlock") await api.adminUnlockUser(id);
      await load();
    } catch (err) {
      setError(localizeError(err, t.messages, "failedToLoadAdmin"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title={t.admin.userDetailTitle}>
      {error ? (
        <Card className="mb-4 p-4 text-sm text-danger">{error}</Card>
      ) : null}
      {!user ? (
        <p className="text-sm text-muted">{t.common.loading}</p>
      ) : (
        <div className="space-y-4">
          <Card className="space-y-2 p-4">
            <p className="text-lg font-bold">{user.username}</p>
            <p className="text-sm text-muted">{user.email}</p>
            <p className="text-xs">
              {t.admin.role}: {user.role} · {t.admin.status}:{" "}
              {t.admin.statuses[user.status]}
            </p>
            {user.wallet ? (
              <p className="text-sm font-semibold">
                {formatIrr(user.wallet.balance, user.wallet.currency)}
              </p>
            ) : null}
          </Card>

          {user.status === "ACTIVE" ? (
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="danger"
                disabled={busy}
                onClick={() =>
                  void runAction("disable", t.admin.confirmDisable)
                }
              >
                {t.admin.disable}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void runAction("lock", t.admin.confirmLock)}
              >
                {t.admin.lock}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                disabled={busy}
                onClick={() => void runAction("enable", t.admin.confirmEnable)}
              >
                {t.admin.enable}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void runAction("unlock", t.admin.confirmUnlock)}
              >
                {t.admin.unlock}
              </Button>
            </div>
          )}

          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-bold">{t.admin.nav.transactions}</h2>
            {user.recentTransactions.length === 0 ? (
              <p className="text-xs text-muted">{t.admin.empty}</p>
            ) : (
              user.recentTransactions.map((tx) => (
                <Link
                  key={tx.id}
                  href={`/admin/transactions/${tx.id}`}
                  className="block text-xs hover:text-primary"
                >
                  {tx.type} · {formatIrr(tx.amount)} ·{" "}
                  {formatDisplayDateTime(tx.createdAt, language)}
                </Link>
              ))
            )}
          </Card>

          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-bold">{t.admin.nav.payments}</h2>
            {user.recentPayments.length === 0 ? (
              <p className="text-xs text-muted">{t.admin.empty}</p>
            ) : (
              user.recentPayments.map((payment) => (
                <Link
                  key={payment.id}
                  href={`/admin/payments/${payment.id}`}
                  className="block text-xs hover:text-primary"
                >
                  {payment.status} · {formatIrr(payment.amount)} ·{" "}
                  {payment.refId ?? "—"}
                </Link>
              ))
            )}
          </Card>

          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-bold">{t.security.eventsTitle}</h2>
            {user.securityEvents.length === 0 ? (
              <p className="text-xs text-muted">{t.admin.empty}</p>
            ) : (
              user.securityEvents.map((event) => (
                <p key={event.id} className="text-xs">
                  {event.type} ·{" "}
                  {formatDisplayDateTime(event.createdAt, language)}
                </p>
              ))
            )}
          </Card>

          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-bold">{t.security.sessionsTitle}</h2>
            {user.sessions.length === 0 ? (
              <p className="text-xs text-muted">{t.admin.empty}</p>
            ) : (
              user.sessions.map((session) => (
                <p key={session.id} className="text-xs">
                  {session.deviceLabel ?? t.security.unknownDevice} ·{" "}
                  {formatDisplayDateTime(session.lastSeenAt, language)}
                </p>
              ))
            )}
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
