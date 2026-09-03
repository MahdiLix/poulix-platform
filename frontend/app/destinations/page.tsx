"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Landmark, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { TextField } from "@/shared/ui/TextField";
import { Select } from "@/shared/ui/Select";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import type {
  CreateSavedDestinationPayload,
  FinancialDestination,
  FinancialDestinationType,
} from "@/features/financial-destinations/lib/destinations";

type PageStatus = "loading" | "ready" | "unauthenticated" | "error";

export default function DestinationsPage() {
  const { t } = useLanguage();
  const [saved, setSaved] = useState<FinancialDestination[]>([]);
  const [recent, setRecent] = useState<FinancialDestination[]>([]);
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
      <HeaderBar title={t.destinations.title} backHref="/" />

      <div className="flex flex-1 flex-col space-y-4 p-6 lg:mx-auto lg:max-w-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Landmark className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{t.destinations.subtitle}</h2>
            <p className="text-xs text-muted">{t.destinations.description}</p>
          </div>
        </div>

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
          <>
            <Card className="space-y-3 p-4">
              <h3 className="text-sm font-bold">{t.destinations.savedTitle}</h3>
              {saved.length === 0 ? (
                <p className="text-xs text-muted">
                  {t.destinations.emptySaved}
                </p>
              ) : (
                <ul className="space-y-2">
                  {saved.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-surface-muted p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs text-muted">
                          {t.destinations.types[item.type]} · {item.maskedValue}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        className="text-muted hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-3 p-4">
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
                      <p className="text-muted">
                        {t.destinations.types[item.type]} · {item.maskedValue}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="space-y-3 p-4">
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
                    { value: "P2P_USER", label: t.destinations.types.P2P_USER },
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
                <Button type="submit" disabled={creating}>
                  {creating ? t.destinations.saving : t.destinations.saveBtn}
                </Button>
              </form>
            </Card>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
