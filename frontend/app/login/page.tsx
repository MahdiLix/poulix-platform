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
import { localizeError } from '@/shared/i18n/localizeError';
import {
  loginAndStoreSession,
  validateIdentifier,
  validatePassword,
} from '@/features/auth/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string | null;
    password?: string | null;
  }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

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
      const res = await loginAndStoreSession({ identifier, password }, t.messages);
      setSuccess(`${t.common.welcomeBack}, ${res.user.email}`);
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      setError(localizeError(err, t.messages, 'loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar title={t.auth.welcomeTitle} backHref="/" />

      <div className="flex flex-1 flex-col justify-center space-y-6 p-6 lg:mx-auto lg:w-full lg:max-w-md">
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-extrabold text-foreground">
            {t.auth.welcomeTitle}
          </h2>
          <p className="text-sm text-muted">{t.auth.loginSub}</p>
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
              label={t.auth.usernameOrEmail}
              name="identifier"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="user@example.com"
              error={fieldErrors.identifier}
              disabled={loading}
            />

            <TextField
              label={t.auth.password}
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              error={fieldErrors.password}
              disabled={loading}
            />

            <Button type="submit" disabled={loading}>
              {loading ? t.auth.signingIn : t.auth.signInBtn}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-muted">
          {t.auth.dontHaveAccount}{' '}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline active:opacity-80"
          >
            {t.auth.createOne}
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
