"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  KeyRound,
  LogIn,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { AdminShell } from "@/features/admin/components/AdminShell";
import { Card } from "@/shared/ui/Card";
import { PageSpinner } from "@/shared/ui/Spinner";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { StatCard } from "@/shared/ui/StatCard";
import { DonutChart } from "@/shared/ui/DonutChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/shared/ui/Table";
import { api } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import type { AdminSecurityEvent } from "@/features/admin/lib/admin";
import type { SecurityEventType } from "@/features/security/lib/security";

const TABS = [
  "Security Insights",
  "Login Activity",
  "Blocked Users",
  "API Access",
  "Two-Factor Auth",
];

function eventBadgeVariant(
  type: string,
): "success" | "danger" | "warning" | "muted" {
  if (type.includes("FAILED") || type.includes("SUSPICIOUS")) return "danger";
  if (type.includes("NEW_DEVICE") || type.includes("LIMIT")) return "warning";
  if (type.includes("REVOKED")) return "muted";
  return "success";
}

function countBy(items: AdminSecurityEvent[], matcher: (type: string) => boolean) {
  return items.filter((item) => matcher(item.type)).length;
}

export default function AdminSecurityPage() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminSecurityEvent[]>([]);
  const [insightItems, setInsightItems] = useState<AdminSecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminSecurityEvents({ page })
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

  useEffect(() => {
    let cancelled = false;
    void api
      .getAdminSecurityEvents({ page: 1, pageSize: 100 })
      .then((data) => {
        if (!cancelled) setInsightItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setInsightItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const insightSource = insightItems.length > 0 ? insightItems : items;
  const failedLogins = countBy(insightSource, (type) => type.includes("FAILED_LOGIN"));
  const limitExceeded = countBy(insightSource, (type) => type.includes("LIMIT_EXCEEDED"));
  const newDevice = countBy(insightSource, (type) => type.includes("NEW_DEVICE"));
  const suspicious = countBy(insightSource, (type) => type.includes("SUSPICIOUS"));

  const eventTypeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of insightSource) {
      counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [insightSource]);

  function eventLabel(type: string) {
    const known = type as SecurityEventType;
    return t.security.eventTypes[known] ?? type.replace(/_/g, " ");
  }

  const colors = [
    "var(--danger)",
    "var(--warning)",
    "var(--primary)",
    "var(--accent-teal)",
    "var(--accent-purple)",
    "var(--muted)",
  ];

  return (
    <AdminShell title={t.admin.securityTitle} subtitle={t.admin.subtitle}>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 cursor-pointer rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Events" value={String(total)} icon={LogIn} />
        <StatCard
          label={t.security.eventTypes.FAILED_LOGIN}
          value={String(failedLogins)}
          icon={AlertTriangle}
          iconClassName="bg-danger-soft text-danger"
        />
        <StatCard
          label={t.security.eventTypes.NEW_DEVICE_LOGIN}
          value={String(newDevice)}
          icon={Smartphone}
        />
        <StatCard
          label={t.admin.suspiciousEvents}
          value={String(suspicious)}
          icon={ShieldAlert}
          iconClassName="bg-accent-amber-soft text-accent-amber"
        />
      </div>

      <div className="mb-6 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Security Insights</h2>
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="space-y-4 p-5 lg:col-span-4">
            <p className="text-xs font-semibold text-muted">Event mix</p>
            <DonutChart
              segments={
                eventTypeCounts.length > 0
                  ? eventTypeCounts.map(([type, value], index) => ({
                      label: eventLabel(type),
                      value,
                      color: colors[index % colors.length],
                    }))
                  : [{ label: t.admin.empty, value: 1, color: "var(--border)" }]
              }
              centerValue={String(insightSource.length)}
              centerLabel="Sample"
            />
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
            <InsightCard
              label={t.security.eventTypes.FAILED_LOGIN}
              value={failedLogins}
              tone="danger"
            />
            <InsightCard
              label={t.security.eventTypes.LIMIT_EXCEEDED}
              value={limitExceeded}
              tone="warning"
            />
            <InsightCard
              label={t.security.eventTypes.NEW_DEVICE_LOGIN}
              value={newDevice}
              tone="info"
            />
            <InsightCard
              label={t.security.eventTypes.SUSPICIOUS_ACTIVITY}
              value={suspicious}
              tone="danger"
            />
          </div>
        </div>

        <Card className="space-y-3 p-5">
          <h3 className="text-sm font-bold text-foreground">Event timeline</h3>
          {insightSource.length === 0 ? (
            <p className="text-xs text-muted">{t.admin.empty}</p>
          ) : (
            <ol className="space-y-2">
              {insightSource.slice(0, 8).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {item.user.username}
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatDisplayDateTime(item.createdAt, language)}
                    </p>
                  </div>
                  <Badge variant={eventBadgeVariant(item.type)}>
                    {eventLabel(item.type)}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h2 className="mb-3 text-sm font-bold text-foreground">
            Recent Login Activity
          </h2>
          {error ? (
            <div className="rounded-xl bg-danger-soft p-4 text-sm text-danger">
              {error}
            </div>
          ) : loading ? (
            <PageSpinner label={t.common.loading} />
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted">
              {t.admin.empty}
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Event</TableHeaderCell>
                <TableHeaderCell>Time</TableHeaderCell>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold">
                      {item.user.username}
                    </TableCell>
                    <TableCell>
                      <Badge variant={eventBadgeVariant(item.type)}>
                        {eventLabel(item.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted">
                      {formatDisplayDateTime(item.createdAt, language)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {total > 20 ? (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-auto"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t.admin.prev}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-auto"
                disabled={page * 20 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                {t.admin.next}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-4">
          <h2 className="mb-3 text-sm font-bold text-foreground">
            Event types
          </h2>
          <Card className="space-y-3 p-5">
            {eventTypeCounts.length === 0 ? (
              <p className="text-xs text-muted">{t.admin.empty}</p>
            ) : (
              eventTypeCounts.map(([type, value]) => (
                <div key={type} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-foreground">
                    {eventLabel(type)}
                  </span>
                  <Badge variant={eventBadgeVariant(type)}>{value}</Badge>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}

function InsightCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "danger" | "warning" | "info";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-danger-soft text-danger"
      : tone === "warning"
        ? "bg-warning-soft text-warning"
        : "bg-primary-soft text-primary";

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-[11px] font-semibold text-muted">{label}</p>
        <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      </div>
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}
      >
        <KeyRound className="h-4 w-4" />
      </div>
    </Card>
  );
}
