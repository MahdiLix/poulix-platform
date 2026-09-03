"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, FileText } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Select } from "@/shared/ui/Select";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDate } from "@/shared/i18n/dates";
import { localizeError, formatMessage } from "@/shared/i18n/localizeError";
import { formatIrr, parseAmount } from "@/features/wallet/lib/wallet";
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

export default function HistoryPage() {
  const { t, language } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<HistoryStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter !== "ALL" && tx.type !== typeFilter) {
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
      return reason.includes(query) || counterparty.includes(query);
    });
  }, [transactions, typeFilter, search]);

  useEffect(() => {
    void loadHistory();
  }, []);

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
      const data = await api.getTransactions();
      if (!Array.isArray(data)) {
        throw new Error(t.messages.historyResponseInvalid);
      }
      setTransactions(data);
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

  return (
    <AppShell>
      <HeaderBar title={t.history.historyTitle} backHref="/" />

      <div className="flex-1 space-y-4 p-6 lg:mx-auto lg:w-full lg:max-w-4xl lg:p-8">
        {status === "loading" ? (
          <div className="py-12 text-center text-xs font-semibold text-muted">
            {t.history.loadingHistory}
          </div>
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
        ) : transactions.length === 0 ? (
          <div className="space-y-3 py-16 text-center lg:mx-auto lg:max-w-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-muted">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-sm font-bold text-foreground">
              {t.history.noTransactionsYet}
            </p>
            <p className="mx-auto max-w-[200px] text-xs text-muted">
              {t.history.noTransactionsSub}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.history.searchPlaceholder}
                className="flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/40 focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <Select
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
                className="sm:w-56"
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
            {filteredTransactions.map((tx) => {
              const isIncoming =
                tx.type === "DEPOSIT" ||
                tx.type === "TRANSFER_IN" ||
                tx.type === "GOAL_RELEASE" ||
                tx.type === "ENVELOPE_RELEASE";
              const formattedDate = formatDisplayDate(tx.createdAt, language);
              const categoryLabel =
                tx.category && isTransactionCategory(tx.category)
                  ? t.history.categories[tx.category as TransactionCategory]
                  : null;

              let title = t.history.deposit;
              if (tx.type === "WITHDRAWAL") {
                title = t.history.withdrawal;
              } else if (tx.type === "TRANSFER_OUT") {
                title = tx.counterpartyUser?.username
                  ? formatMessage(t.history.toUser, {
                      name: tx.counterpartyUser.username,
                    })
                  : t.history.transferSent;
              } else if (tx.type === "TRANSFER_IN") {
                title = tx.counterpartyUser?.username
                  ? formatMessage(t.history.fromUser, {
                      name: tx.counterpartyUser.username,
                    })
                  : t.history.transferReceived;
              } else if (tx.type === "GOAL_CONTRIBUTE") {
                title = t.goals.goalContribute;
              } else if (tx.type === "GOAL_RELEASE") {
                title = t.goals.goalRelease;
              } else if (tx.type === "ENVELOPE_ALLOCATE") {
                title = t.envelopes.envelopeAllocate;
              } else if (tx.type === "ENVELOPE_RELEASE") {
                title = t.envelopes.envelopeRelease;
              }

              return (
                <Card
                  key={tx.id}
                  className="flex items-center justify-between rounded-2xl p-4 transition hover:shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        isIncoming
                          ? "bg-success-soft text-success"
                          : "bg-primary-soft text-primary"
                      }`}
                    >
                      {isIncoming ? (
                        <ArrowDown className="h-5 w-5" />
                      ) : (
                        <ArrowUp className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-foreground lg:text-sm">
                        {title}
                      </h3>
                      <p className="text-[11px] font-medium text-muted">
                        {formattedDate}
                      </p>
                      {categoryLabel || tx.reason ? (
                        <p className="mt-0.5 text-[11px] font-medium text-muted">
                          {categoryLabel ? <span>{categoryLabel}</span> : null}
                          {categoryLabel && tx.reason ? (
                            <span className="mx-1">·</span>
                          ) : null}
                          {tx.reason ? <span>{tx.reason}</span> : null}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <span
                    className={`text-sm font-extrabold lg:text-base ${
                      isIncoming ? "text-success" : "text-foreground"
                    }`}
                  >
                    {isIncoming ? "+" : "-"}
                    {formatIrr(parseAmount(tx.amount))}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
