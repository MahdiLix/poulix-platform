'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/shared/layout/AppShell';
import { HeaderBar } from '@/shared/layout/HeaderBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { TextField } from '@/shared/ui/TextField';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { formatMessage, localizeError } from '@/shared/i18n/localizeError';
import {
  registerAndStoreSession,
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/features/auth/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string | null;
    email?: string | null;
    password?: string | null;
    confirmPassword?: string | null;
  }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      setSuccess(
        formatMessage(t.messages.accountCreatedFor, { email: res.user.email }),
      );
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(localizeError(err, t.messages, 'registrationFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar title={t.auth.createAccountBtn} backHref="/" />

      <div className="flex flex-1 flex-col justify-center space-y-6 p-6 lg:mx-auto lg:w-full lg:max-w-md">
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-extrabold text-foreground">
            {t.auth.joinTitle}
          </h2>
          <p className="text-sm text-muted">{t.auth.registerSub}</p>
        </div>

        <Card className="space-y-4 p-6">
          {error ? (
            <div className="rounded-xl bg-danger-soft p-3 text-xs font-medium text-danger">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl bg-success-soft p-3 text-xs font-medium text-success">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <TextField
              label={t.auth.username}
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="john_doe"
              error={fieldErrors.username}
              disabled={loading}
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
            />

            <TextField
              label={t.auth.password}
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={fieldErrors.password}
              disabled={loading}
            />

            <TextField
              label={t.auth.confirmPassword}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              error={fieldErrors.confirmPassword}
              disabled={loading}
            />

            <Button type="submit" disabled={loading}>
              {loading ? t.auth.creatingAccount : t.auth.createAccountBtn}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted">
          {t.auth.alreadyHaveAccount}{' '}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline active:opacity-80"
          >
            {t.auth.signInLink}
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
