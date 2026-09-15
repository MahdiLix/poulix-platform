export type DatedRecord = {
  createdAt?: string | null;
};

export function filterByDayRange<T extends DatedRecord>(
  records: T[],
  days: number,
  now = new Date(),
): T[] {
  const safeDays = Math.max(1, Math.trunc(days));
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (safeDays - 1));

  return records.filter((record) => {
    if (!record.createdAt) return false;
    const createdAt = new Date(record.createdAt);
    return (
      !Number.isNaN(createdAt.getTime()) &&
      createdAt >= cutoff &&
      createdAt <= now
    );
  });
}

export function previousDayRange<T extends DatedRecord>(
  records: T[],
  days: number,
  now = new Date(),
): T[] {
  const safeDays = Math.max(1, Math.trunc(days));
  const currentStart = new Date(now);
  currentStart.setHours(0, 0, 0, 0);
  currentStart.setDate(currentStart.getDate() - (safeDays - 1));

  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - safeDays);

  return records.filter((record) => {
    if (!record.createdAt) return false;
    const createdAt = new Date(record.createdAt);
    return (
      !Number.isNaN(createdAt.getTime()) &&
      createdAt >= previousStart &&
      createdAt < currentStart
    );
  });
}

export function percentChange(
  current: number,
  previous: number,
): number | undefined {
  if (previous <= 0) return current > 0 ? 100 : undefined;
  return Math.round(((current - previous) / previous) * 100);
}
