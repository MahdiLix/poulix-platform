const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]!);
}

export function localizeDigits(
  value: string | number,
  language: "en" | "fa",
): string {
  return language === "fa" ? toPersianDigits(value) : String(value);
}

export function isNumericInput(
  type?: string,
  inputMode?: string,
): boolean {
  return type === "number" || inputMode === "numeric" || inputMode === "decimal";
}
