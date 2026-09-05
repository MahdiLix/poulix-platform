"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/shared/cn";

export type SelectOption = {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
};

export type SelectProps = {
  label?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string | null;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Select option...",
  error,
  disabled = false,
  className,
  id,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setIsOpen(false);
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
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-[10px] border bg-surface px-3.5 text-sm font-medium transition text-start cursor-pointer hover:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:outline-none",
            error ? "border-danger" : "border-border",
            disabled && "opacity-60 cursor-not-allowed",
            isOpen && "ring-2 ring-primary border-primary",
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.icon ? (
              <selectedOption.icon className="h-4 w-4 text-primary shrink-0" />
            ) : null}
            <span
              className={cn(
                "truncate",
                selectedOption ? "text-foreground" : "text-muted",
              )}
            >
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted transition-transform shrink-0 ms-2",
              isOpen && "rotate-180 text-primary",
            )}
          />
        </button>

        {isOpen && !disabled ? (
          <div className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
            <div role="listbox" className="space-y-0.5">
              {options.map((option) => {
                const isSelected = option.value === value;
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition text-start cursor-pointer",
                      isSelected
                        ? "bg-primary-soft text-primary"
                        : "text-foreground hover:bg-surface-muted",
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
                      <span>{option.label}</span>
                    </span>
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 ms-2" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : null}
    </div>
  );
}
