"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/shared/cn";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDate } from "@/shared/i18n/dates";

export type DatePickerProps = {
  label?: ReactNode;
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
  id?: string;
  allowClear?: boolean;
};

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = "Select date...",
  error,
  disabled = false,
  minDate,
  maxDate,
  className,
  id,
  allowClear = true,
}: DatePickerProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsedDate = value ? parseISO(value) : undefined;
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSelect(date: Date | undefined) {
    if (date) {
      const isoStr = format(date, "yyyy-MM-dd");
      onChange(isoStr);
    } else {
      onChange("");
    }
    setIsOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  return (
    <div className={cn("relative space-y-1", className)} ref={containerRef}>
      {label ? (
        <label htmlFor={id} className="block text-xs font-semibold text-muted">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={cn(
            "flex w-full items-center justify-between rounded-2xl border bg-surface px-4 py-3 text-sm font-medium transition text-start cursor-pointer hover:border-primary/40 focus:ring-2 focus:ring-primary focus:outline-none",
            error ? "border-danger" : "border-border",
            disabled && "opacity-60 cursor-not-allowed",
            isOpen && "ring-2 ring-primary border-primary",
          )}
        >
          <span className="flex items-center gap-2.5 truncate">
            <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
            <span
              className={cn(
                "truncate",
                isValidDate ? "text-foreground font-semibold" : "text-muted",
              )}
            >
              {isValidDate ? formatDisplayDate(value!, language) : placeholder}
            </span>
          </span>

          <span className="flex items-center gap-1.5 ms-2">
            {allowClear && isValidDate && !disabled ? (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="rounded-full p-1 text-muted hover:bg-surface-muted hover:text-foreground transition"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </span>
        </button>

        {isOpen && !disabled ? (
          <div className="absolute inset-x-0 sm:inset-x-auto sm:start-0 top-full z-50 mt-1.5 rounded-2xl border border-border bg-surface p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
            <DayPicker
              mode="single"
              selected={isValidDate ? parsedDate : undefined}
              onSelect={handleSelect}
              startMonth={minDate}
              endMonth={maxDate}
              disabled={[
                ...(minDate ? [{ before: minDate }] : []),
                ...(maxDate ? [{ after: maxDate }] : []),
              ]}
              className="poulix-calendar text-foreground"
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : null}
    </div>
  );
}
