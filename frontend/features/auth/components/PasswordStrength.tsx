"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/cn";

export function scorePassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}

function strengthLabel(score: number): string {
  if (score <= 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  return "Strong";
}

function strengthColor(score: number): string {
  if (score <= 1) return "bg-danger";
  if (score === 2) return "bg-warning";
  if (score === 3) return "bg-success";
  return "bg-primary";
}

export function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < score ? strengthColor(score) : "bg-surface-muted",
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-semibold",
            score <= 1
              ? "text-danger"
              : score === 2
                ? "text-warning"
                : "text-success",
          )}
        >
          {strengthLabel(score)}
        </span>
        <span className="text-muted">
          {score >= 3 ? (
            <span className="flex items-center gap-1 text-success">
              <Check className="h-3 w-3" />
              Looks good
            </span>
          ) : (
            "Use 8+ chars with numbers & symbols"
          )}
        </span>
      </div>
    </div>
  );
}
