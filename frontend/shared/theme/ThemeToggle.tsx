'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { cn } from '@/shared/cn';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-surface-muted text-foreground transition hover:bg-border active:scale-95 active:bg-border',
        className,
      )}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
