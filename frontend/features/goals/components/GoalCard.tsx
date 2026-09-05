"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CalendarDays,
  Car,
  Eye,
  Gift,
  Heart,
  Home,
  Laptop,
  Plane,
  Plus,
  Shield,
  Target,
  Wallet,
} from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge } from "@/shared/ui/Badge";
import { ProgressBar } from "@/shared/ui/ProgressBar";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { formatDisplayDate, formatDisplayDateTime } from "@/shared/i18n/dates";
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
  color?: string;
};

const GOAL_COLORS = [
  "#1a7a68",
  "#4a8ea8",
  "#c4a05a",
  "#c45c4a",
  "#7c6bc4",
  "#2ea88f",
];

function goalIcon(title: string, className: string): ReactNode {
  const lower = title.toLowerCase();
  if (lower.includes("emergency") || lower.includes("shield") || lower.includes("safety")) return <Shield className={className} />;
  if (lower.includes("laptop") || lower.includes("computer") || lower.includes("tech") || lower.includes("device")) return <Laptop className={className} />;
  if (lower.includes("vacation") || lower.includes("travel") || lower.includes("trip") || lower.includes("holiday")) return <Plane className={className} />;
  if (lower.includes("home") || lower.includes("house") || lower.includes("rent")) return <Home className={className} />;
  if (lower.includes("car") || lower.includes("vehicle") || lower.includes("auto")) return <Car className={className} />;
  if (lower.includes("gift") || lower.includes("present") || lower.includes("birthday")) return <Gift className={className} />;
  if (lower.includes("health") || lower.includes("medical") || lower.includes("heart")) return <Heart className={className} />;
  if (lower.includes("wallet") || lower.includes("fund")) return <Wallet className={className} />;
  return <Target className={className} />;
}

function latestContributionDate(goal: Goal): string | null {
  if (!goal.contributions || goal.contributions.length === 0) return null;
  const latest = goal.contributions.reduce((max, c) => (c.createdAt > max.createdAt ? c : max), goal.contributions[0]);
  return latest.createdAt;
}

export function GoalCard({ goal, color }: GoalCardProps) {
  const { t, language } = useLanguage();

  const saved = parseGoalAmount(goal.savedAmount);
  const target = parseGoalAmount(goal.targetAmount);
  const progress = goalProgressPercent(saved, target);
  const remaining = goalRemainingAmount(saved, target);
  const tone = statusTone(goal.status);
  const accentColor = color || GOAL_COLORS[0];
  const lastContribution = latestContributionDate(goal);

  return (
    <Card className="flex flex-col gap-4 p-4 transition hover:border-primary/25">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          {goalIcon(goal.title, "h-5 w-5")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-foreground">
              {goal.title}
            </h3>
            <Badge variant={tone === "success" ? "success" : "muted"}>
              {t.goals.statuses[goal.status]}
            </Badge>
          </div>
          {goal.description ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-muted">
              {goal.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold" style={{ color: accentColor }}>
          Saved {formatIrr(saved)} / {formatIrr(target)}
        </p>
        <ProgressBar
          value={progress}
          barClassName="bg-success"
        />
        <div className="flex items-center justify-between text-[11px] font-medium text-muted">
          <span>{progress}%</span>
          <span>
            {t.goals.remaining}: {formatIrr(remaining)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
        {goal.targetDate ? (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {formatDisplayDate(goal.targetDate, language)}
            </span>
          </div>
        ) : (
          <div />
        )}
        {lastContribution ? (
          <div className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {formatDisplayDateTime(lastContribution, language)}
            </span>
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Link href={`/goals/${goal.id}`} className="flex-1">
          <Button size="sm" variant="outline" className="w-full gap-1">
            <Plus className="h-3.5 w-3.5" />
            {t.goals.contributeBtn}
          </Button>
        </Link>
        <Link href={`/goals/${goal.id}`} className="flex-1">
          <Button size="sm" variant="outline" className="w-full text-danger hover:text-danger">
            {t.goals.releaseBtn}
          </Button>
        </Link>
        <Link href={`/goals/${goal.id}`}>
          <Button size="sm" variant="ghost" className="px-2">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
