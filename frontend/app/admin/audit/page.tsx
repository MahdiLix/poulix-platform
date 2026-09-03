"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import type { AdminAuditLog } from "@/features/admin/lib/admin";

export default function AdminAuditPage() {
  const { t, language } = useLanguage();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminAuditLogs({ page })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(localizeError(err, t.messages, "failedToLoadAdmin"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, t.messages]);

  return (
    <AdminShell title={t.admin.auditTitle}>
      {error ? <Card className="p-4 text-sm text-danger">{error}</Card> : null}
      {loading ? (
        <p className="text-sm text-muted">{t.common.loading}</p>
      ) : items.length === 0 ? (
        <Card className="p-6 text-sm text-muted">{t.admin.empty}</Card>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="p-4 text-xs">
                <p className="font-bold">{item.action}</p>
                <p className="text-muted">
                  {item.adminUser.username} · {item.targetType}{" "}
                  {item.targetId ?? ""} ·{" "}
                  {formatDisplayDateTime(item.createdAt, language)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {total > 20 ? (
        <div className="mt-4 flex gap-2">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t.admin.prev}
          </Button>
          <Button
            variant="ghost"
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            {t.admin.next}
          </Button>
        </div>
      ) : null}
    </AdminShell>
  );
}
