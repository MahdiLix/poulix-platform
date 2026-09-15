"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditCard, Hash, Landmark, Plus, Trash2, User } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { TextField } from "@/shared/ui/TextField";
import { Select } from "@/shared/ui/Select";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDateTime } from "@/shared/i18n/dates";
import { localizeError } from "@/shared/i18n/localizeError";
import { useRateLimitAction, withRemainingLabel } from "@/shared/rate-limit";
import type {
  CreateSavedDestinationPayload,
  DestinationValueResponse,
  FinancialDestination,
  FinancialDestinationType,
} from "@/features/financial-destinations/lib/destinations";

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

function destinationIcon(type: FinancialDestinationType) {
  if (type === "P2P_USER") return User;
  if (type === "BANK_ACCOUNT") return Landmark;
  if (type === "SHABA") return Hash;
  return CreditCard;
}

function revealedLabel(value?: DestinationValueResponse | null) {
  if (!value) return null;
  if (value.type === "BANK_ACCOUNT") return value.accountNumber;
  if (value.type === "SHABA") return value.shabaNumber;
  if (value.type === "CARD") return value.cardNumber;
  return value.recipientUsername;
}

function destinationBadgeClass(type: FinancialDestinationType) {
  if (type === "P2P_USER") return "bg-primary-soft text-primary";
  if (type === "BANK_ACCOUNT") return "bg-warning-soft text-warning";
  if (type === "SHABA") return "bg-surface-muted text-muted";
  return "bg-danger-soft text-danger";
}

export default function DestinationsPage() {
  const { t, language } = useLanguage();
  const { blocked, remainingSeconds } = useRateLimitAction("destinations");
  const [saved, setSaved] = useState<FinancialDestination[]>([]);
  const [recent, setRecent] = useState<FinancialDestination[]>([]);
  const [revealed, setRevealed] = useState<
    Record<string, DestinationValueResponse>
  >({});
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FinancialDestinationType>("BANK_ACCOUNT");
  const [accountNumber, setAccountNumber] = useState("");
  const [shabaNumber, setShabaNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [recipient, setRecipient] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    if (!getStoredToken()) {
      setPageStatus("unauthenticated");
      return;
    }

    setPageStatus("loading");
    setError(null);

    try {
      const [savedData, recentData] = await Promise.all([
        api.getSavedDestinations(),
        api.getRecentDestinations(),
      ]);
      setSaved(savedData);
      setRecent(recentData.filter((item) => !item.isSaved));
      const all = [...savedData, ...recentData];
      const values = await Promise.all(
        all.slice(0, 16).map(async (item) => {
          const value = await api
            .getDestinationValue(item.id)
            .catch(() => null);
          return [item.id, value] as const;
        }),
      );
      const next: Record<string, DestinationValueResponse> = {};
      for (const [id, value] of values) {
        if (value) next[id] = value;
      }
      setRevealed(next);
      setPageStatus("ready");
    } catch (err) {
      if (!getStoredToken()) {
        setPageStatus("unauthenticated");
        return;
      }
      setError(localizeError(err, t.messages, "failedToLoadDestinations"));
      setPageStatus("error");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: CreateSavedDestinationPayload = {
        label: label.trim(),
        type,
      };
      if (type === "BANK_ACCOUNT") payload.accountNumber = accountNumber;
      if (type === "SHABA") payload.shabaNumber = shabaNumber;
      if (type === "CARD") payload.cardNumber = cardNumber;
      if (type === "P2P_USER") payload.recipient = recipient;

      await api.createSavedDestination(payload);
      setLabel("");
      setAccountNumber("");
      setShabaNumber("");
      setCardNumber("");
      setRecipient("");
      await loadData();
    } catch (err) {
      setError(localizeError(err, t.messages, "failedToSaveDestination"));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteSavedDestination(id);
      await loadData();
    } catch {
      // ignore
    }
  }

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.destinations.title}
        backHref="/"
        subtitle={t.destinations.description}
      />

      <div className="flex flex-1 flex-col space-y-4 p-4 lg:mx-auto lg:max-w-6xl lg:p-6">
        {pageStatus === "unauthenticated" ? (
          <Card className="p-6 text-center">
            <p className="text-sm font-semibold">
              {t.destinations.signInRequired}
            </p>
            <Link href="/login" className="mt-3 inline-block">
              <Button>{t.common.signIn}</Button>
            </Link>
          </Card>
        ) : null}

        {error ? (
          <Card className="p-4 text-center text-sm text-danger">{error}</Card>
        ) : null}

        {pageStatus === "ready" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-3 p-5 lg:col-span-2">
              <h3 className="text-sm font-bold">{t.destinations.savedTitle}</h3>
              {saved.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted">
                  {t.destinations.emptySaved}
                </p>
              ) : (
                <ul className="space-y-2">
                  {saved.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {(() => {
                          const Icon = destinationIcon(item.type);
                          return (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                          );
                        })()}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold">
                              {item.label}
                            </p>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${destinationBadgeClass(item.type)}`}
                            >
                              {t.destinations.types[item.type]}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-muted">
                            {revealedLabel(revealed[item.id]) ??
                              item.maskedValue}
                          </p>
                          <p className="text-[10px] text-muted">
                            {t.destinations.useCount}: {item.useCount} ·{" "}
                            {t.destinations.lastUsed}:{" "}
                            {formatDisplayDateTime(item.lastUsedAt, language)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={
                            item.type === "P2P_USER"
                              ? `/send?destinationId=${encodeURIComponent(item.id)}`
                              : `/transfer?destinationId=${encodeURIComponent(item.id)}`
                          }
                        >
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-auto"
                          >
                            {item.type === "P2P_USER"
                              ? t.home.send
                              : t.home.withdraw}
                          </Button>
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          className="text-muted hover:text-danger"
                          aria-label="Delete destination"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-4">
              <Card className="space-y-3 p-5">
                <h3 className="text-sm font-bold">
                  {t.destinations.recentTitle}
                </h3>
                {recent.length === 0 ? (
                  <p className="text-xs text-muted">
                    {t.destinations.emptyRecent}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {recent.slice(0, 8).map((item) => (
                      <li
                        key={item.id}
                        className="rounded-xl bg-surface-muted p-3 text-xs"
                      >
                        <p className="font-semibold">{item.label}</p>
                        <p className="font-mono text-muted">
                          {revealedLabel(revealed[item.id]) ?? item.maskedValue}
                        </p>
                        <p className="mt-1 text-[10px] text-muted">
                          {t.destinations.types[item.type]} ·{" "}
                          {t.destinations.useCount}: {item.useCount}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="space-y-3 p-5">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t.destinations.addSaved}
                </h3>
                <form
                  onSubmit={(e) => void handleCreate(e)}
                  className="space-y-3"
                >
                  <TextField
                    label={t.destinations.friendlyName}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                  <Select
                    label={t.destinations.destinationType}
                    value={type}
                    onChange={(val) => setType(val as FinancialDestinationType)}
                    options={[
                      {
                        value: "BANK_ACCOUNT",
                        label: t.destinations.types.BANK_ACCOUNT,
                      },
                      { value: "SHABA", label: t.destinations.types.SHABA },
                      { value: "CARD", label: t.destinations.types.CARD },
                      {
                        value: "P2P_USER",
                        label: t.destinations.types.P2P_USER,
                      },
                    ]}
                  />
                  {type === "BANK_ACCOUNT" ? (
                    <TextField
                      label={t.destinations.accountNumber}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  ) : null}
                  {type === "SHABA" ? (
                    <TextField
                      label={t.destinations.shabaNumber}
                      value={shabaNumber}
                      onChange={(e) => setShabaNumber(e.target.value)}
                    />
                  ) : null}
                  {type === "CARD" ? (
                    <TextField
                      label={t.destinations.cardNumber}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  ) : null}
                  {type === "P2P_USER" ? (
                    <TextField
                      label={t.send.recipient}
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                  ) : null}
                  <Button type="submit" disabled={creating || blocked}>
                    {creating
                      ? t.destinations.saving
                      : withRemainingLabel(
                          t.destinations.saveBtn,
                          remainingSeconds,
                        )}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
