const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toLatinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

/** Strip grouping separators and non-digits so payment logic can use a raw integer string. */
export function toRawAmountDigits(value: unknown): string {
  return toLatinDigits(String(value ?? "")).replace(/\D/g, "");
}

export function localizeDigits(
  value: string | number,
  language: "en" | "fa" = "en",
): string {
  void language;
  return toLatinDigits(String(value));
}

export function isNumericInput(
  type?: string,
  inputMode?: string,
): boolean {
  return type === "number" || inputMode === "numeric" || inputMode === "decimal";
}
