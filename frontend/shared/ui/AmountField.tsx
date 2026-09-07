"use client";

import type { ChangeEvent } from "react";
import { TextField, type TextFieldProps } from "@/shared/ui/TextField";
import { toLatinDigits, toRawAmountDigits } from "@/shared/ui/latinDigits";

type AmountFieldProps = Omit<
  TextFieldProps,
  "type" | "inputMode" | "rightIcon" | "onChange"
> & {
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

/** Numeric IRR input with one shared suffix and virtual-keypad behavior. */
export function formatAmountInput(value: unknown): string {
  const digits = toRawAmountDigits(value);
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
  return (
    <TextField
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={toLatinDigits(placeholder)}
      value={formatAmountInput(value)}
      className={className}
      rightIcon={
        <span className="pointer-events-none pe-1 text-[11px] font-semibold text-muted">
          IRR
        </span>
      }
      onChange={(event) => {
        const value = toRawAmountDigits(event.target.value);
        onChange?.({
          ...event,
          target: { ...event.target, value },
          currentTarget: { ...event.currentTarget, value },
        });
      }}
    />
  );
}
