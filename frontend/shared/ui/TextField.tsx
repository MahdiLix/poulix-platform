import type { InputHTMLAttributes } from 'react';
import { cn } from '@/shared/cn';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
};

export function TextField({
  label,
  error,
  className,
  id,
  ...props
}: TextFieldProps) {
  const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="mb-1 block text-xs font-semibold text-muted"
      >
        {label}
      </label>
      <input
        id={fieldId}
        className={cn(
          'w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-foreground transition hover:border-primary/40 focus:ring-2 focus:ring-primary focus:outline-none',
          error ? 'border-danger' : 'border-border',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger">{error}</p>
      ) : null}
    </div>
  );
}
