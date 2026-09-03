"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDate } from "@/shared/i18n/dates";
import { formatIrr } from "@/features/wallet/lib/wallet";
import {
  goalProgressPercent,
  goalRemainingAmount,
  parseGoalAmount,
  statusTone,
  type Goal,
} from "@/features/goals/lib/goals";

type GoalCardProps = {
  goal: Goal;
};

export function GoalCard({ goal }: GoalCardProps) {
  const { t, language } = useLanguage();

  const saved = parseGoalAmount(goal.savedAmount);
  const target = parseGoalAmount(goal.targetAmount);
  const progress = goalProgressPercent(saved, target);
  const remaining = goalRemainingAmount(saved, target);
  const tone = statusTone(goal.status);
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : "bg-surface-muted text-muted";

  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className="space-y-3 rounded-2xl p-4 transition hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${toneClass}`}
              >
                {t.goals.statuses[goal.status]}
              </span>
              {goal.targetDate ? (
                <span className="text-[11px] font-medium text-muted">
                  {formatDisplayDate(goal.targetDate, language)}
                </span>
              ) : null}
            </div>
            <h3 className="mt-1 text-sm font-bold text-foreground">
              {goal.title}
            </h3>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted rtl:rotate-180" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted">{formatIrr(saved)}</span>
            <span className="text-foreground">{formatIrr(target)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-muted">
            <span>{progress}%</span>
            <span>
              {t.goals.remaining}: {formatIrr(remaining)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
