"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  FileText,
  Layers,
  PiggyBank,
} from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";
import { PageSpinner } from "@/shared/ui/Spinner";
import { SearchInput } from "@/shared/ui/SearchInput";
import { Select } from "@/shared/ui/Select";
import { Pagination } from "@/shared/ui/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/shared/ui/Table";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDate, formatDisplayDateTime } from "@/shared/i18n/dates";
import { localizeError, formatMessage } from "@/shared/i18n/localizeError";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
import {
  transactionReasonLabel,
  transactionTypeLabel,
} from "@/features/wallet/lib/transactionDisplay";
import type {
  TranslationDictionary,
  Language,
} from "@/shared/i18n/messages/types";
import { cn } from "@/shared/cn";
import {
  isTransactionCategory,
  type TransactionCategory,
} from "@/features/wallet/lib/transactionMeta";

type Transaction = {
  id: string;
  type: string;
  amount: string | number;
  createdAt: string;
  reason?: string | null;
  category?: string | null;
  counterpartyUser?: {
    username: string;
    email: string;
  } | null;
};

type HistoryStatus = "loading" | "ready" | "unauthenticated" | "error";

type LucideIcon = ComponentType<{ className?: string }>;

const ROWS_PER_PAGE = 10;

const PILL_OPTIONS = [
  { value: "ALL", label: "All", matches: ["ALL"] as string[] },
  { value: "DEPOSIT", label: "Deposit", matches: ["DEPOSIT"] as string[] },
  {
    value: "WITHDRAWAL",
    label: "Withdrawal",
    matches: ["WITHDRAWAL"] as string[],
  },
  {
    value: "TRANSFER_OUT",
    label: "Transfer sent",
    matches: ["TRANSFER_OUT"] as string[],
  },
  {
    value: "TRANSFER_IN",
    label: "Transfer received",
    matches: ["TRANSFER_IN"] as string[],
  },
  {
    value: "GOALS",
    label: "Goals",
    matches: ["GOAL_CONTRIBUTE", "GOAL_RELEASE"] as string[],
  },
  {
    value: "ENVELOPES",
    label: "Envelopes",
    matches: ["ENVELOPE_ALLOCATE", "ENVELOPE_RELEASE"] as string[],
  },
];

export default function HistoryPage() {
  const { t, language } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<HistoryStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [pillFilter, setPillFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, pillFilter, search]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const pillMatches =
      PILL_OPTIONS.find((p) => p.value === pillFilter)?.matches ?? [pillFilter];

    return transactions.filter((tx) => {
      if (typeFilter !== "ALL" && tx.type !== typeFilter) {
        return false;
      }
      if (pillFilter !== "ALL" && !pillMatches.includes(tx.type)) {
        return false;
      }
      if (!query) {
        return true;
      }
      const reason = tx.reason?.toLowerCase() ?? "";
      const counterparty =
        tx.counterpartyUser?.username?.toLowerCase() ??
        tx.counterpartyUser?.email?.toLowerCase() ??
        "";
      const id = tx.id.toLowerCase();
      return (
        reason.includes(query) ||
        counterparty.includes(query) ||
        id.includes(query)
      );
    });
  }, [transactions, typeFilter, pillFilter, search]);

  const paginatedTransactions = filteredTransactions;

  const totalPages = Math.max(
    1,
    Math.ceil(total / ROWS_PER_PAGE),
  );
  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 250);
    return () => window.clearTimeout(timer);
    // loadHistory intentionally reads the current filter state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter, pillFilter, search]);

  async function loadHistory() {
    const token = getStoredToken();
    if (!token) {
      setTransactions([]);
      setError(null);
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const serverType =
        typeFilter !== "ALL"
          ? typeFilter
          : pillFilter !== "ALL"
            ? pillFilter
            : undefined;
      const data = await api.getTransactionsPage<Transaction>({
        page,
        pageSize: ROWS_PER_PAGE,
        type: serverType,
        q: search.trim() || undefined,
      });
      setTransactions(data.items);
      setTotal(data.total);
      setStatus("ready");
    } catch (err) {
      if (!getStoredToken()) {
        setTransactions([]);
        setError(null);
        setStatus("unauthenticated");
        return;
      }

      setTransactions([]);
      setError(localizeError(err, t.messages, "failedToLoadHistory"));
      setStatus("error");
    }
  }

  async function exportHistory() {
    if (!getStoredToken() || exporting) return;
    setExporting(true);
    try {
      const pageSize = 100;
      let pageNumber = 1;
      const items: Transaction[] = [];
      let totalCount = 0;
      do {
        const data = await api.getTransactionsPage<Transaction>({
          page: pageNumber,
          pageSize,
        });
        totalCount = data.total;
        items.push(...data.items);
        if (data.items.length === 0 || items.length >= totalCount) {
          break;
        }
        pageNumber += 1;
      } while (pageNumber <= 100);

      const header = [
        t.history.transactionId,
        "type",
        t.history.categoryLabel,
        t.history.reasonLabel,
        t.history.counterparty,
        "amount",
        "createdAt",
      ];
      const rows = items.map((tx) => [
        tx.id,
        transactionTypeLabel(tx.type, t),
        tx.category && isTransactionCategory(tx.category)
          ? t.history.categories[tx.category]
          : "",
        tx.reason ? transactionReasonLabel(tx.reason, t) : "",
        tx.counterpartyUser?.username || tx.counterpartyUser?.email || "",
        String(parseAmount(tx.amount)),
        formatDisplayDateTime(tx.createdAt, language),
      ]);
      const csv = [header, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const value = String(cell ?? "");
              if (/[",\n]/.test(value)) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(","),
        )
        .join("\n");
      const blob = new Blob([`\uFEFF${csv}`], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "transactions.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(localizeError(err, t.messages, "failedToLoadHistory"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <HeaderBar
        title={t.history.historyTitle}
        backHref="/"
        subtitle="Every deposit, transfer, withdrawal, goal, and envelope movement."
        trailing={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportHistory()}
            disabled={exporting || status === "unauthenticated"}
            className="w-auto gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        }
      />

      <div className="flex-1 space-y-4 p-4 lg:p-6">
        {status === "loading" ? (
          <PageSpinner label={t.history.loadingHistory} />
        ) : status === "unauthenticated" ? (
          <div className="space-y-4 py-16 text-center lg:mx-auto lg:max-w-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-muted">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {t.history.signInToViewHistory}
            </p>
            <p className="mx-auto max-w-[220px] text-xs text-muted">
              {t.history.historyPrivateMsg}
            </p>
            <div className="mx-auto flex max-w-xs flex-col gap-2">
              <Link href="/login" className="cursor-pointer">
                <Button className="w-full">{t.common.signIn}</Button>
              </Link>
              <Link href="/register" className="cursor-pointer">
                <Button variant="secondary" className="w-full">
                  {t.common.createAccount}
                </Button>
              </Link>
            </div>
          </div>
        ) : status === "error" ? (
          <div className="space-y-3 py-16 text-center lg:mx-auto lg:max-w-md">
            <div className="rounded-xl bg-danger-soft p-3 text-xs font-semibold text-danger">
              {error || t.messages.couldNotLoadTransactions}
            </div>
            <Button variant="secondary" onClick={() => void loadHistory()}>
              {t.common.retry}
            </Button>
          </div>
        ) : (
          <Card className="space-y-4 p-4 lg:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search reason, recipient, or ID..."
                />
              </div>
              <Select
                label="Type"
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
                className="lg:w-56"
                options={[
                  { value: "ALL", label: t.history.filterAll },
                  { value: "DEPOSIT", label: t.history.deposit },
                  { value: "WITHDRAWAL", label: t.history.withdrawal },
                  { value: "TRANSFER_OUT", label: t.history.transferSent },
                  { value: "TRANSFER_IN", label: t.history.transferReceived },
                  { value: "GOAL_CONTRIBUTE", label: t.goals.goalContribute },
                  { value: "GOAL_RELEASE", label: t.goals.goalRelease },
                  {
                    value: "ENVELOPE_ALLOCATE",
                    label: t.envelopes.envelopeAllocate,
                  },
                  {
                    value: "ENVELOPE_RELEASE",
                    label: t.envelopes.envelopeRelease,
                  },
                ]}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {PILL_OPTIONS.map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setPillFilter(pill.value)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95",
                    pillFilter === pill.value
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-surface text-foreground hover:bg-surface-muted",
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="space-y-3 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-muted">
                  <FileText className="h-7 w-7" />
                </div>
                <p className="text-sm font-bold text-foreground">
                  {transactions.length === 0
                    ? t.history.noTransactionsYet
                    : "No matching transactions"}
                </p>
                <p className="mx-auto max-w-[220px] text-xs text-muted">
                  {transactions.length === 0
                    ? t.history.noTransactionsSub
                    : "Try a different search or filter."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHead>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Details</TableHeaderCell>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell>Amount</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                    </TableHead>
                    <TableBody>
                      {paginatedTransactions.map((tx) => {
                        const row = buildTxRow(tx, t, language);
                        return (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full",
                                    row.iconBg,
                                  )}
                                >
                                  <row.Icon
                                    className={cn("h-4 w-4", row.iconColor)}
                                  />
                                </div>
                                <span className="text-xs font-semibold">
                                  {row.typeLabel}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-semibold text-foreground">
                                {row.title}
                              </div>
                              {row.details ? (
                                <div className="text-xs text-muted">
                                  {row.details}
                                </div>
                              ) : null}
                              {row.counterparty ? (
                                <div className="text-[11px] text-muted">
                                  {t.history.counterparty}:{" "}
                                  <bdi>{row.counterparty}</bdi>
                                </div>
                              ) : null}
                              <div className="font-mono text-[10px] text-muted">
                                {t.history.transactionId}: {tx.id}
                              </div>
                            </TableCell>
                            <TableCell>{row.categoryBadge}</TableCell>
                            <TableCell
                              className={cn(
                                "text-xs font-bold",
                                row.amountColor,
                              )}
                            >
                              {row.amountPrefix}
                              {formatIrr(Math.abs(parseAmount(tx.amount)))}
                            </TableCell>
                            <TableCell className="text-xs text-muted">
                              {row.formattedDateTime}
                            </TableCell>
                            <TableCell>
                              <Badge variant="success" className="text-[10px]">
                                {t.withdrawal.completed}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-3 lg:hidden">
                  {paginatedTransactions.map((tx) => {
                    const row = buildTxRow(tx, t, language);
                    const meta = [row.title, row.details]
                      .filter(Boolean)
                      .join(" · ");

                    return (
                      <div
                        key={tx.id}
                        className="flex items-start justify-between rounded-2xl border border-border bg-surface p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                              row.iconBg,
                            )}
                          >
                            <row.Icon
                              className={cn("h-5 w-5", row.iconColor)}
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-foreground">
                              {row.typeLabel}
                            </h3>
                            {meta ? (
                              <p className="text-[11px] font-medium text-muted">
                                {meta}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {row.categoryBadge}
                              <Badge
                                variant="success"
                                className="text-[10px]"
                              >
                                {t.withdrawal.completed}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-[11px] font-medium text-muted">
                            {row.formattedDate}
                          </p>
                          <p
                            className={cn(
                              "text-sm font-extrabold",
                              row.amountColor,
                            )}
                          >
                            {row.amountPrefix}
                            {formatIrr(Math.abs(parseAmount(tx.amount)))}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex flex-col items-center gap-3 border-t border-border pt-4">
              <span className="text-xs text-muted">
                Showing {paginatedTransactions.length} of{" "}
                {total}
              </span>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function buildTxRow(
  tx: Transaction,
  t: TranslationDictionary,
  language: Language,
) {
  const formattedDate = formatDisplayDate(tx.createdAt, language);
  const formattedDateTime = formatDisplayDateTime(tx.createdAt, language);
  const categoryLabel =
    tx.category && isTransactionCategory(tx.category)
      ? t.history.categories[tx.category as TransactionCategory]
      : null;

  const amount = parseAmount(tx.amount);

  let title: string;
  let typeLabel: string;
  let Icon: LucideIcon;
  let iconBg: string;
  let iconColor: string;
  let amountColor: string;
  let amountPrefix: string;

  switch (tx.type) {
    case "DEPOSIT":
      title = t.history.deposit;
      typeLabel = t.history.deposit;
      Icon = ArrowDownLeft;
      iconBg = "bg-success-soft";
      iconColor = "text-success";
      amountColor = "text-success";
      amountPrefix = "+";
      break;
    case "WITHDRAWAL":
      title = t.history.withdrawal;
      typeLabel = t.history.withdrawal;
      Icon = ArrowUpRight;
      iconBg = "bg-danger-soft";
      iconColor = "text-danger";
      amountColor = "text-danger";
      amountPrefix = "-";
      break;
    case "TRANSFER_OUT":
      title = tx.counterpartyUser?.username
        ? formatMessage(t.history.toUser, {
            name: tx.counterpartyUser.username,
          })
        : t.history.transferSent;
      typeLabel = t.history.transferSent;
      Icon = ArrowUpRight;
      iconBg = "bg-danger-soft";
      iconColor = "text-danger";
      amountColor = "text-danger";
      amountPrefix = "-";
      break;
    case "TRANSFER_IN":
      title = tx.counterpartyUser?.username
        ? formatMessage(t.history.fromUser, {
            name: tx.counterpartyUser.username,
          })
        : t.history.transferReceived;
      typeLabel = t.history.transferReceived;
      Icon = ArrowDownLeft;
      iconBg = "bg-success-soft";
      iconColor = "text-success";
      amountColor = "text-success";
      amountPrefix = "+";
      break;
    case "GOAL_CONTRIBUTE":
      title = t.goals.goalContribute;
      typeLabel = t.goals.goalContribute;
      Icon = PiggyBank;
      iconBg = "bg-accent-amber-soft";
      iconColor = "text-accent-amber";
      amountColor = "text-danger";
      amountPrefix = "-";
      break;
    case "GOAL_RELEASE":
      title = t.goals.goalRelease;
      typeLabel = t.goals.goalRelease;
      Icon = ArrowDownLeft;
      iconBg = "bg-success-soft";
      iconColor = "text-success";
      amountColor = "text-success";
      amountPrefix = "+";
      break;
    case "ENVELOPE_ALLOCATE":
      title = t.envelopes.envelopeAllocate;
      typeLabel = t.envelopes.envelopeAllocate;
      Icon = Layers;
      iconBg = "bg-accent-teal-soft";
      iconColor = "text-accent-teal";
      amountColor = "text-danger";
      amountPrefix = "-";
      break;
    case "ENVELOPE_RELEASE":
      title = t.envelopes.envelopeRelease;
      typeLabel = t.envelopes.envelopeRelease;
      Icon = ArrowDownLeft;
      iconBg = "bg-success-soft";
      iconColor = "text-success";
      amountColor = "text-success";
      amountPrefix = "+";
      break;
    default:
      title = transactionTypeLabel(tx.type, t);
      typeLabel = transactionTypeLabel(tx.type, t);
      Icon = amount >= 0 ? ArrowDownLeft : ArrowUpRight;
      iconBg = amount >= 0 ? "bg-success-soft" : "bg-danger-soft";
      iconColor = amount >= 0 ? "text-success" : "text-danger";
      amountColor = amount >= 0 ? "text-success" : "text-danger";
      amountPrefix = amount >= 0 ? "+" : "-";
  }

  const details = tx.reason ? transactionReasonLabel(tx.reason, t) : null;

  const categoryBadge = categoryLabel ? (
    <Badge
      variant="default"
      className={cn("rounded-full text-[10px]", categoryBadgeClass(tx.category))}
    >
      {categoryLabel}
    </Badge>
  ) : (
    <span className="text-xs text-muted">-</span>
  );

  return {
    Icon,
    iconBg,
    iconColor,
    amountColor,
    amountPrefix,
    formattedDate,
    formattedDateTime,
    title,
    typeLabel,
    details,
    categoryBadge,
    counterparty:
      tx.counterpartyUser?.username || tx.counterpartyUser?.email || null,
  };
}

function categoryBadgeClass(category?: string | null): string {
  switch (category) {
    case "RENT":
      return "bg-warning-soft text-warning";
    case "SHOPPING":
      return "bg-accent-purple-soft text-accent-purple";
    case "GIFT":
      return "bg-accent-rose-soft text-accent-rose";
    case "DINNER":
    case "LUNCH":
      return "bg-danger-soft text-danger";
    case "TRANSPORTATION":
      return "bg-accent-teal-soft text-accent-teal";
    case "FAMILY_SUPPORT":
      return "bg-secondary-soft text-secondary";
    case "OTHER":
      return "bg-surface-muted text-muted";
    default:
      return "bg-surface-muted text-muted";
  }
}

