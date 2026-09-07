"use client";

import type { ChangeEvent } from "react";
import { TextField, type TextFieldProps } from "@/shared/ui/TextField";
import { toLatinDigits } from "@/shared/ui/latinDigits";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

type AmountFieldProps = Omit<
  TextFieldProps,
  "type" | "inputMode" | "rightIcon" | "onChange"
> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

/** Numeric IRR input with one shared suffix and virtual-keypad behavior. */
export function formatAmountInput(value: unknown): string {
  const digits = toLatinDigits(String(value ?? "")).replace(/\D/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function AmountField({
  onChange,
  className,
  placeholder = "100,000",
  value,
  ...props
}: AmountFieldProps) {
  const { t } = useLanguage();
  return (
    <TextField
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      placeholder={toLatinDigits(placeholder)}
      value={formatAmountInput(value)}
      className={className}
      rightIcon={
        <span className="pointer-events-none pe-1 text-[11px] font-semibold text-muted">
          {t.common.currency}
        </span>
      }
      onChange={(event) => {
        const value = toLatinDigits(event.target.value).replace(/\D/g, "");
        onChange?.({
          ...event,
          target: { ...event.target, value },
          currentTarget: { ...event.currentTarget, value },
        });
      }}
    />
  );
}
