"use client";

import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/shared/cn";
import { isNumericInput, toLatinDigits } from "@/shared/ui/latinDigits";
import { NumericKeypad } from "@/shared/ui/NumericKeypad";
import {
  isMobileViewport,
  isVirtualKeyboardEnabled,
} from "@/shared/preferences/virtualKeyboard";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function TextField({
  label,
  error,
  hint,
  className,
  id,
  leftIcon,
  rightIcon,
  onChange,
  onFocus,
  onBlur,
  value,
  type,
  inputMode,
  placeholder,
  ...props
}: TextFieldProps) {
  const fieldId = id || props.name || label.toLowerCase().replace(/\s+/g, "-");
  const numeric = isNumericInput(type, inputMode);
  const [focused, setFocused] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadEnabled, setKeypadEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function syncPreference() {
      setKeypadEnabled(isVirtualKeyboardEnabled());
    }
    syncPreference();
    window.addEventListener("poulix:virtual-keyboard", syncPreference);
    window.addEventListener("storage", syncPreference);
    return () => {
      window.removeEventListener("poulix:virtual-keyboard", syncPreference);
      window.removeEventListener("storage", syncPreference);
    };
  }, []);

  useEffect(() => {
    if (!numeric || !focused || !keypadEnabled) {
      setShowKeypad(false);
      return;
    }
    setShowKeypad(isMobileViewport());
  }, [focused, numeric, keypadEnabled]);

  useEffect(() => {
    if (!showKeypad) return;
    const frame = window.requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showKeypad]);

  function emitValue(next: string) {
    onChange?.({
      target: { value: numeric ? toLatinDigits(next) : next },
    } as React.ChangeEvent<HTMLInputElement>);
  }

  const currentValue = String(value ?? "");
  const keypadValue = numeric
    ? toLatinDigits(currentValue).replace(/[,\s]/g, "")
    : currentValue;

  return (
    <div ref={containerRef}>
      <label
        htmlFor={fieldId}
        className="mb-1.5 block text-xs font-semibold text-foreground"
      >
        {label}
      </label>
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-muted">
            {leftIcon}
          </span>
        ) : null}
        <input
          id={fieldId}
          type={numeric && showKeypad ? "text" : type}
          inputMode={numeric ? inputMode || "numeric" : inputMode}
          lang={numeric ? "en" : undefined}
          dir={numeric ? "ltr" : undefined}
          value={value}
          placeholder={placeholder}
          readOnly={showKeypad}
          onChange={(event) => {
            if (showKeypad) return;
            const next = numeric
              ? toLatinDigits(event.target.value)
              : event.target.value;
            emitValue(next);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={cn(
            "h-10 w-full rounded-[10px] border bg-surface text-sm text-foreground transition placeholder:text-muted/80 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
            numeric && "tabular-nums placeholder:font-normal",
            leftIcon && rightIcon
              ? numeric
                ? "ps-10 pr-10"
                : "ps-10 pe-10"
              : leftIcon
                ? "ps-10 pe-3.5"
                : rightIcon
                  ? numeric
                    ? "ps-3.5 pr-10"
                    : "ps-3.5 pe-10"
                  : "px-3.5",
            error ? "border-danger" : "border-border",
            className,
          )}
          {...props}
        />
        {rightIcon ? (
          <span
            className={
              numeric
                ? "absolute inset-y-0 right-0 flex items-center pe-2"
                : "absolute inset-y-0 end-0 flex items-center pe-2"
            }
          >
            {rightIcon}
          </span>
        ) : null}
      </div>
      {showKeypad ? (
        <NumericKeypad
          className="mt-2 xl:hidden"
          onDigit={(digit) => emitValue(`${keypadValue}${digit}`)}
          onBackspace={() => emitValue(keypadValue.slice(0, -1))}
          onDone={() => setShowKeypad(false)}
        />
      ) : null}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
