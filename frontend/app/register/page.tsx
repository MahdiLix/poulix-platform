"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { flashToast } from "@/shared/ui/Toast";
import { getStoredToken } from "@/shared/api";
import { isolateText } from "@/shared/user/displayName";
import {
  BarChart3,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Send,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { TextField } from "@/shared/ui/TextField";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { LanguageToggle } from "@/shared/theme/LanguageToggle";
import { BrandLogo } from "@/shared/brand/BrandLogo";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatMessage, localizeError } from "@/shared/i18n/localizeError";
import {
  registerAndStoreSession,
  isValidEmailAddress,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/features/auth/lib/auth";
import { PasswordStrength } from "@/features/auth/components/PasswordStrength";

export default function RegisterPage() {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string | null;
    email?: string | null;
    password?: string | null;
    confirmPassword?: string | null;
  }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const usernameIsValid =
    username.trim().length >= 3 && !fieldErrors.username;
  const emailIsValid =
    isValidEmailAddress(email) && !fieldErrors.email;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const nextErrors = {
      username: validateUsername(username, t.messages),
      email: validateEmail(email, t.messages),
      password: validatePassword(password, t.messages),
      confirmPassword:
        confirmPassword !== password ? t.messages.passwordsDoNotMatch : null,
    };
    setFieldErrors(nextErrors);

    if (
      nextErrors.username ||
      nextErrors.email ||
      nextErrors.password ||
      nextErrors.confirmPassword
    ) {
      return;
    }

    setLoading(true);
    try {
      const res = await registerAndStoreSession(
        { username, email, password },
        t.messages,
      );
      flashToast({
        title: t.messages.success.registerSuccess,
        description: formatMessage(t.messages.accountCreatedFor, {
          email: isolateText(res.user.email),
        }),
      });
      window.location.assign("/");
    } catch (err: unknown) {
      setError(localizeError(err, t.messages, "registrationFailed"));
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
            {t.auth.registerHeadline.replace(/\.$/, "")}
            <span className="text-primary">.</span>
          </h2>
          <p className="text-xs leading-relaxed text-sidebar-muted">
            {t.auth.registerTagline}
          </p>
          <ul className="space-y-2 text-xs text-sidebar-muted">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
              {t.auth.proofZarinpal}
            </li>
            <li className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5 shrink-0 text-primary" />
              {t.auth.proofTransfers}
            </li>
            <li className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 shrink-0 text-primary" />
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
                <p className="text-xs font-bold uppercase tracking-wider text-accent-amber">
                  {t.auth.joinTitle}
                </p>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  {t.auth.registerHeading}
                </h2>
                <p className="text-sm text-muted">{t.auth.registerSub}</p>
              </div>

              {error ? (
                <div className="rounded-xl bg-danger-soft p-3 text-xs font-medium text-danger">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <TextField
                  label={t.auth.username}
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john_doe"
                  error={fieldErrors.username}
                  disabled={loading}
                  leftIcon={<User className="h-4 w-4" />}
                  rightIcon={
                    usernameIsValid ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : undefined
                  }
                />

                <TextField
                  label={t.auth.email}
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  error={fieldErrors.email}
                  disabled={loading}
                  leftIcon={<Mail className="h-4 w-4" />}
                  rightIcon={
                    emailIsValid ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : undefined
                  }
                />

                <div className="space-y-1.5">
                  <TextField
                    label={t.auth.password}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
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
                  <PasswordStrength password={password} />
                </div>

                <TextField
                  label={t.auth.confirmPassword}
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  error={fieldErrors.confirmPassword}
                  disabled={loading}
                  leftIcon={<Lock className="h-4 w-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="rounded p-1 text-muted transition hover:bg-surface-muted hover:text-foreground"
                      aria-label="Toggle confirm password visibility"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />

                <Button type="submit" disabled={loading}>
                  {loading ? t.auth.creatingAccount : t.auth.createAccountBtn}
                </Button>
              </form>

              <p className="text-center text-sm text-muted">
                {t.auth.alreadyHaveAccount}{" "}
                <Link
                  href="/login"
                  className="font-semibold text-primary hover:underline"
                >
                  {t.auth.signInLink}
                </Link>
              </p>

              <p className="text-center text-[11px] leading-relaxed text-muted">
                By creating an account, you agree to our{" "}
                <Link href="#" className="font-semibold text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="font-semibold text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
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
