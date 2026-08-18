import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary-hover active:bg-primary-active',
    secondary:
      'bg-primary-soft text-primary hover:bg-secondary-soft active:bg-primary-soft',
    ghost:
      'bg-surface-muted text-foreground hover:bg-border active:bg-border',
    danger:
      'bg-danger-soft text-danger hover:opacity-90 active:opacity-80',
  };

  return (
    <button
      type={type}
      className={cn(
        'w-full cursor-pointer rounded-2xl px-4 py-3.5 text-sm font-semibold transition active:scale-95 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
