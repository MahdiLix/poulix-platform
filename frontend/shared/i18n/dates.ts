import type { Language } from "./translations";

export type CalendarMonth = {
  year: number;
  month: number;
  key: string;
  label: string;
};

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function toDate(value: Date | string | number): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const match = ISO_DATE_ONLY.exec(value.trim());
    if (match) {
      const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
      );
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfDayIso(dateInput: string): string {
  const trimmed = dateInput.trim();
  const match = ISO_DATE_ONLY.exec(trimmed);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`;
  }

  return new Date(trimmed).toISOString();
}

export function calendarFor(language: Language): "persian" | "gregory" {
  return language === "fa" ? "persian" : "gregory";
}

export function localeFor(language: Language): string {
  return language === "fa"
    ? "fa-IR-u-ca-persian-nu-latn"
    : "en-US-u-ca-gregory-nu-latn";
}

function numericCalendarParts(date: Date, language: Language) {
  return new Intl.DateTimeFormat("en-US-u-nu-latn", {
    calendar: calendarFor(language),
    numberingSystem: "latn",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
}

function numericPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  return Number(parts.find((part) => part.type === type)?.value);
}

export function getCalendarYearMonth(
  date: Date,
  language: Language,
): { year: number; month: number; day: number } {
  const parts = numericCalendarParts(date, language);
  return {
    year: numericPart(parts, "year"),
    month: numericPart(parts, "month"),
    day: numericPart(parts, "day"),
  };
}

export function monthLabel(month: number, language: Language): string {
  const safeMonth = Math.min(12, Math.max(1, month));
  if (language === "en") {
    return new Intl.DateTimeFormat(localeFor(language), {
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2024, safeMonth - 1, 1)));
  }

  const formatter = new Intl.DateTimeFormat(localeFor(language), {
    month: "long",
    timeZone: "UTC",
  });
  const start = Date.UTC(2024, 2, 1);
  for (let offset = 0; offset < 400; offset += 1) {
    const date = new Date(start + offset * 86_400_000);
    if (getCalendarYearMonth(date, language).month === safeMonth) {
      return formatter.format(date);
    }
  }
  return String(safeMonth);
}

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getLastMonths(
  count: number,
  language: Language,
): CalendarMonth[] {
  const now = new Date();
  const current = getCalendarYearMonth(now, language);
  const months: CalendarMonth[] = [];
  let year = current.year;
  let month = current.month;

  for (let index = 0; index < count; index += 1) {
    months.push({
      year,
      month,
      key: monthKey(year, month),
      label: monthLabel(month, language),
    });
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }

  return months.reverse();
}

export function formatDisplayDate(
  value: Date | string | number,
  language: Language,
): string {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(localeFor(language), {
    calendar: calendarFor(language),
    numberingSystem: "latn",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatScheduleDate(
  value: Date | string | number,
  language: Language,
): string {
  const date =
    typeof value === "string" && ISO_DATE_ONLY.test(value.trim())
      ? new Date(`${value.trim()}T00:00:00.000Z`)
      : toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(localeFor(language), {
    calendar: calendarFor(language),
    numberingSystem: "latn",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatMonthDay(
  value: Date | string | number,
  language: Language,
): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(localeFor(language), {
    calendar: calendarFor(language),
    numberingSystem: "latn",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDisplayDateTime(
  value: Date | string | number,
  language: Language,
): string {
  const date = toDate(value);
  if (!date) return "";

  const datePart = formatDisplayDate(date, language);
  const timePart = new Intl.DateTimeFormat(localeFor(language), {
    calendar: calendarFor(language),
    numberingSystem: "latn",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  const separator = language === "fa" ? "، " : ", ";
  return `${datePart}${separator}${timePart}`;
}
