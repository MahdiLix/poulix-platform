'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { TextField } from '@/shared/ui/TextField';
import { useLanguage } from '@/shared/i18n/LanguageProvider';
import { localizeError } from '@/shared/i18n/localizeError';
import {
  loginAndStoreSession,
  registerAndStoreSession,
  validateEmail,
  validateIdentifier,
  validatePassword,
  validateUsername,
} from '@/features/auth/lib/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const identifierError = validateIdentifier(username || email, t.messages);
      const passwordError = validatePassword(password, t.messages);
      if (identifierError || passwordError) {
        setError(identifierError || passwordError || t.messages.invalidForm);
        return;
      }
    } else {
      const usernameError = validateUsername(username, t.messages);
      const emailError = validateEmail(email, t.messages);
      const passwordError = validatePassword(password, t.messages);
      if (usernameError || emailError || passwordError) {
        setError(
          usernameError || emailError || passwordError || t.messages.invalidForm,
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        await loginAndStoreSession(
          {
            identifier: username || email,
            password,
          },
          t.messages,
        );
      } else {
        await registerAndStoreSession({ username, email, password }, t.messages);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(localizeError(err, t.messages, 'authenticationFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xl font-bold text-foreground">
            {isLogin ? t.auth.signInBtn : t.auth.createAccountBtn}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted transition hover:bg-surface-muted hover:text-foreground active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="rounded-xl bg-danger-soft p-3 text-xs font-medium text-danger">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {!isLogin ? (
            <TextField
              label={t.auth.username}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="john_doe"
              disabled={loading}
            />
          ) : null}

          <TextField
            label={isLogin ? t.auth.usernameOrEmail : t.auth.email}
            type={isLogin ? 'text' : 'email'}
            value={isLogin ? username || email : email}
            onChange={(e) => {
              if (isLogin) {
                setUsername(e.target.value);
                setEmail(e.target.value);
              } else {
                setEmail(e.target.value);
              }
            }}
            placeholder="user@example.com"
            disabled={loading}
          />

          <TextField
            label={t.auth.password}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
          />

          <Button type="submit" disabled={loading}>
            {loading
              ? t.common.loading
              : isLogin
                ? t.auth.signInBtn
                : t.auth.createAccountBtn}
          </Button>
        </form>

        <div className="space-y-2 border-t border-border pt-2 text-center text-xs">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="font-medium text-muted underline hover:text-primary active:opacity-80 cursor-pointer"
          >
            {isLogin ? t.auth.dontHaveAccount : t.auth.alreadyHaveAccount}
          </button>
          <p className="text-muted">
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline active:opacity-80 ms-1 me-1 cursor-pointer"
            >
              {t.auth.signInBtn}
            </Link>
            {' / '}
            <Link
              href="/register"
              className="font-semibold text-primary hover:underline active:opacity-80 ms-1 me-1 cursor-pointer"
            >
              {t.auth.createAccountBtn}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
