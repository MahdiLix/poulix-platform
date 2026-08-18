import type { ReactNode } from 'react';
import { cn } from '@/shared/cn';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-border bg-surface shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
