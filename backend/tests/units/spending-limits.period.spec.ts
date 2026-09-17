import { spendingLimitPeriodStart } from '../../src/spending-limits/spending-limits.service';

describe('spendingLimitPeriodStart', () => {
  it('starts the Tehran calendar day at 20:30 UTC of the previous UTC date', () => {
    const duringTehranMorning = new Date('2026-09-16T04:45:00.000Z');
    expect(
      spendingLimitPeriodStart(duringTehranMorning, 'day').toISOString(),
    ).toBe('2026-09-15T20:30:00.000Z');
  });

  it('keeps late-evening UTC usage on the previous Tehran day', () => {
    const beforeTehranMidnight = new Date('2026-09-15T20:29:59.000Z');
    expect(
      spendingLimitPeriodStart(beforeTehranMidnight, 'day').toISOString(),
    ).toBe('2026-09-14T20:30:00.000Z');
  });

  it('starts the Tehran calendar month at midnight Tehran on the 1st', () => {
    const midSeptember = new Date('2026-09-16T04:45:00.000Z');
    expect(spendingLimitPeriodStart(midSeptember, 'month').toISOString()).toBe(
      '2026-08-31T20:30:00.000Z',
    );
  });
});
