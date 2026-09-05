"use client";

import { Delete, Check } from "lucide-react";
import { cn } from "@/shared/cn";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function NumericKeypad({
  onDigit,
  onBackspace,
  onDone,
  className,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onDone?: () => void;
  className?: string;
}) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "sheet-enter grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-card)]",
        className,
      )}
      onMouseDown={(event) => event.preventDefault()}
      onTouchStart={(event) => event.preventDefault()}
    >
      {KEYS.map((key, index) => {
        if (!key) {
          return <div key={`empty-${index}`} />;
        }

        if (key === "back") {
          return (
            <button
              key="back"
              type="button"
              onClick={onBackspace}
              className="flex h-12 cursor-pointer items-center justify-center rounded-xl bg-surface-muted text-foreground transition hover:bg-danger-soft hover:text-danger active:scale-95 sm:h-11"
              aria-label="Backspace"
            >
              <Delete className="h-5 w-5" />
            </button>
          );
        }

        return (
          <button
            key={key}
            type="button"
            onClick={() => onDigit(key)}
            className="flex h-12 cursor-pointer items-center justify-center rounded-xl bg-surface-muted text-lg font-bold tabular-nums text-foreground transition hover:bg-primary-soft hover:text-primary active:scale-95 sm:h-11"
          >
            {key}
          </button>
        );
      })}
      {onDone ? (
        <button
          type="button"
          onClick={onDone}
          className="col-span-3 mt-1 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary-hover active:scale-[0.98]"
        >
          <Check className="h-4 w-4" />
          {t.common.done}
        </button>
      ) : null}
    </div>
  );
}
