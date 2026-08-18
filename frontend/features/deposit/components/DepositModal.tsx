'use client';

import { X } from 'lucide-react';
import { DepositForm } from './DepositForm';
import { useLanguage } from '@/shared/i18n/LanguageProvider';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xl font-bold text-foreground">
            {t.deposit.topUpWalletModal}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted transition hover:bg-surface-muted hover:text-foreground active:scale-95 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs font-medium text-muted">
          {t.deposit.topUpModalSub}
        </p>

        <DepositForm />
      </div>
    </div>
  );
}
