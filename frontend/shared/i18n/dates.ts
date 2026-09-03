import type { Language } from "./translations";

const GREGORIAN_MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const SOLAR_HIJRI_MONTHS_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export type CalendarMonth = {
  year: number;
  month: number;
  key: string;
  label: string;
};

function toDate(value: Date | string | number): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calendarFor(language: Language): "persian" | "gregory" {
  return language === "fa" ? "persian" : "gregory";
}

export function localeFor(language: Language): string {
  return language === "fa" ? "fa-IR" : "en-GB";
}

function numericCalendarParts(date: Date, language: Language) {
  return new Intl.DateTimeFormat("en-US", {
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
  const index = Math.min(12, Math.max(1, month)) - 1;
  return language === "fa"
    ? SOLAR_HIJRI_MONTHS_FA[index]
    : GREGORIAN_MONTHS_EN[index];
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
