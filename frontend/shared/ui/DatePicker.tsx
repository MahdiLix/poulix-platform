"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import { Calendar as CalendarIcon, X } from "lucide-react";
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

function toIsoDate(date: DateObject) {
  const gregorianDate = new DateObject(date).convert(gregorian);
  const year = gregorianDate.year;
  const month = String(gregorianDate.month.number).padStart(2, "0");
  const day = String(gregorianDate.day).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AppDatePicker({
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
  const parsedDate = value ? new Date(`${value}T00:00:00`) : undefined;
  const isValidDate = parsedDate && !Number.isNaN(parsedDate.getTime());
  const isPersian = language === "fa";

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
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative space-y-1", className)} ref={containerRef}>
      {label ? (
        <label htmlFor={id} className="block text-xs font-semibold text-muted">
          {label}
        </label>
      ) : null}

      <DatePicker
        id={id}
        calendar={isPersian ? persian : gregorian}
        locale={isPersian ? persian_fa : gregorian_en}
        value={isValidDate ? parsedDate : undefined}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        calendarPosition="bottom-center"
        containerClassName="w-full"
        onChange={(date: DateObject | DateObject[] | null) => {
          if (date && !Array.isArray(date)) {
            onChange(toIsoDate(date));
          } else {
            onChange("");
          }
          setIsOpen(false);
        }}
        render={(_value, openCalendar) => (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              setIsOpen((prev) => !prev);
              openCalendar();
            }}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            className={cn(
              "flex h-10 w-full items-center justify-between rounded-[10px] border bg-surface px-3.5 text-sm font-medium transition text-start cursor-pointer hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
              error ? "border-danger" : "border-border",
              disabled && "cursor-not-allowed opacity-60",
              isOpen && "ring-2 ring-primary border-primary",
            )}
          >
            <span className="flex items-center gap-2.5 truncate">
              <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
              <span
                className={cn(
                  "truncate",
                  isValidDate ? "font-semibold text-foreground" : "text-muted",
                )}
              >
                {isValidDate
                  ? <bdi>{formatDisplayDate(value!, language)}</bdi>
                  : placeholder}
              </span>
            </span>
            {allowClear && isValidDate && !disabled ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange("");
                }}
                className="ms-2 rounded-full p-1 text-muted transition hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </button>
        )}
      />

      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : null}
    </div>
  );
}

export { AppDatePicker as DatePicker };
