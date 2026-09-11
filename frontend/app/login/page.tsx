"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Lock,
  CreditCard,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { TextField } from "@/shared/ui/TextField";
import { Spinner } from "@/shared/ui/Spinner";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { BrandLogo } from "@/shared/brand/BrandLogo";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { flashToast } from "@/shared/ui/Toast";
import { getStoredToken } from "@/shared/api";
import {
  loginAndStoreSession,
  validateIdentifier,
  validatePassword,
} from "@/features/auth/lib/auth";

export default function LoginPage() {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string | null;
    password?: string | null;
  }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (getStoredToken()) {
      window.location.replace("/");
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const nextErrors = {
      identifier: validateIdentifier(identifier, t.messages),
      password: validatePassword(password, t.messages),
    };
    setFieldErrors(nextErrors);

    if (nextErrors.identifier || nextErrors.password) {
      return;
    }

    setLoading(true);
    try {
      await loginAndStoreSession(
        { identifier, password },
        t.messages,
      );
      flashToast({
        title: t.messages.success.loginSuccess,
        description: t.common.welcomeToPoulix,
      });
      window.location.assign("/");
    } catch (err: unknown) {
      setError(localizeError(err, t.messages, "loginFailed"));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <div className="relative hidden w-72 shrink-0 flex-col justify-between bg-sidebar p-7 text-sidebar-foreground xl:w-80 xl:p-8 lg:flex">
        <div className="flex items-center gap-3">
          <BrandLogo size={40} priority />
          <div>
            <p className="text-base font-bold tracking-tight">{t.common.appName}</p>
            <p className="text-[11px] text-sidebar-muted">{t.home.financialWallet}</p>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold leading-snug tracking-tight">
            {t.auth.loginHeadline.replace(/\.$/, "")}
            <span className="text-primary">.</span>
          </h2>
          <p className="text-xs leading-relaxed text-sidebar-muted">
            {t.auth.loginTagline}
          </p>
          <ul className="space-y-2 text-xs text-sidebar-muted">
            <li className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 shrink-0 text-primary" />
              {t.auth.proofZarinpal}
            </li>
            <li className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5 shrink-0 text-primary" />
              {t.auth.proofTransfers}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              {t.auth.proofLimits}
            </li>
          </ul>
        </div>
        <p className="text-[11px] text-sidebar-muted">
          English and Persian · Light and dark supported
        </p>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-end gap-2 p-4 lg:p-6">
          <LanguageToggle />
          <ThemeToggle />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
          <div className="w-full max-w-md space-y-6">
            <div className="mb-2 flex items-center gap-3 lg:hidden">
              <BrandLogo size={40} />
              <p className="text-lg font-bold">{t.common.appName}</p>
            </div>

            <Card className="space-y-5 rounded-3xl p-6 lg:p-8">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {t.auth.welcomeTitle}
                </h2>
                <p className="text-sm text-muted">{t.auth.loginSub}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <TextField
                  label={t.auth.username}
                  name="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="sara"
                  error={fieldErrors.identifier}
                  disabled={loading}
                  leftIcon={<User className="h-4 w-4" />}
                />

                <TextField
                  label={t.auth.password}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  error={fieldErrors.password}
                  disabled={loading}
                  leftIcon={<Lock className="h-4 w-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="rounded p-1 text-muted transition hover:bg-surface-muted hover:text-foreground"
                      aria-label="Toggle password visibility"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />

                {error ? (
                  <div className="rounded-xl bg-danger-soft p-3 text-xs font-medium text-danger">
                    {error}
                  </div>
                ) : null}

                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Spinner size="sm" label={t.auth.signingIn} />
                  ) : (
                    t.auth.signInBtn
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted">
                {t.auth.dontHaveAccount}{" "}
                <Link
                  href="/register"
                  className="font-semibold text-primary hover:underline"
                >
                  {t.auth.createOne}
                </Link>
                .
              </p>

              <div className="flex items-start gap-2 border-t border-border pt-4 text-xs text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  {t.auth.adminNote.split("Admin Console")[0]}
                  <span className="font-semibold text-primary underline">
                    {t.admin.title}
                  </span>
                  {t.auth.adminNote.split("Admin Console")[1] ?? ""}
                </p>
              </div>
            </Card>

            <p className="text-center">
              <Link
                href="/"
                className="text-xs font-medium text-muted hover:text-foreground"
              >
                ← {t.common.backToWallet}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
