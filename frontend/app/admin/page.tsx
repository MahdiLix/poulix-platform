"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatIrr } from "@/features/wallet/lib/wallet";
import type { AdminDashboard } from "@/features/admin/lib/admin";

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .getAdminDashboard()
      .then(setData)
      .catch((err) =>
        setError(localizeError(err, t.messages, "failedToLoadAdmin")),
      );
  }, [t.messages]);

  return (
    <AdminShell title={t.admin.dashboardTitle}>
      {error ? (
        <Card className="p-6 text-sm text-danger">{error}</Card>
      ) : !data ? (
        <p className="text-sm text-muted">{t.common.loading}</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t.admin.totalUsers} value={String(data.users.total)} />
            <Stat
              label={t.admin.activeUsers}
              value={String(data.users.active)}
            />
            <Stat
              label={t.admin.totalWallets}
              value={String(data.wallets.total)}
            />
            <Stat
              label={t.admin.unreadNotifications}
              value={String(data.notifications.unread)}
            />
            <Stat
              label={t.admin.totalDeposits}
              value={formatIrr(data.transactions.depositAmount)}
            />
            <Stat
              label={t.admin.totalWithdrawals}
              value={formatIrr(data.transactions.withdrawalAmount)}
            />
            <Stat
              label={t.admin.totalTransfers}
              value={formatIrr(data.transactions.transferAmount)}
            />
            <Stat
              label={t.admin.pendingPayments}
              value={String(data.operations.pendingPayments)}
            />
            <Stat
              label={t.admin.failedPayments}
              value={String(data.operations.failedPayments)}
            />
            <Stat
              label={t.admin.failedScheduled}
              value={String(data.operations.failedScheduledExecutions)}
            />
            <Stat
              label={t.admin.suspiciousEvents}
              value={String(data.operations.suspiciousEvents)}
            />
          </div>

          <Card className="space-y-3 p-4">
            <h2 className="text-sm font-bold">{t.admin.recentActivity}</h2>
            {data.recentActivity.length === 0 ? (
              <p className="text-xs text-muted">{t.admin.empty}</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {data.recentActivity.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/admin/transactions/${item.id}`}
                      className="flex justify-between gap-3 hover:text-primary"
                    >
                      <span>
                        {item.type} · {item.user.username}
                      </span>
                      <span className="font-semibold">
                        {formatIrr(item.amount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="text-sm font-bold">{t.admin.recentSecurity}</h2>
            {data.recentSecurityEvents.length === 0 ? (
              <p className="text-xs text-muted">{t.admin.empty}</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {data.recentSecurityEvents.map((item) => (
                  <li key={item.id}>
                    <Link href="/admin/security" className="hover:text-primary">
                      {item.type} · {item.user.username}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Link href="/admin/users">
            <Button variant="secondary">{t.admin.nav.users}</Button>
          </Link>
        </div>
      )}
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </Card>
  );
}
